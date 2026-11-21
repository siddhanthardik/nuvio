/**
 * Nuvio Medical Tourism Platform - Organization Configuration & Patient Dossier Store
 * Handles persistence, indexing, duplicate detection, stage transitions, follow-ups,
 * consultation tracking, document coordination, task management, and communication queue on local VPS.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { writeFileAtomic } from "../atomic.ts";
import {
  type Consultation,
  type FollowUp,
  type NuvioPatientDossier,
  type PatientDossierInput,
  type PatientDocument,
  type TimelineEvent,
  canTransitionStage,
  consultationSchema,
  followUpSchema,
  patientDocumentSchema,
  patientDossierSchema,
} from "../../shared/nuvio/patient-journey.ts";
import {
  type NuvioOrganizationConfig,
  type NuvioOrganizationConfigInput,
  DEFAULT_ORGANIZATION_CONFIG,
  organizationConfigSchema,
} from "../../shared/nuvio/organization-config.ts";
import {
  type CommunicationQueueItem,
  type CommunicationStatus,
  type CoordinatorTask,
  type DetailedCaseEvent,
  type OperationsFilterQuery,
  type TaskCategory,
  type TaskPriority,
  type TaskStatus,
  communicationQueueItemSchema,
  coordinatorTaskSchema,
} from "../../shared/nuvio/patient-operations.ts";
import { evaluateDossierNurturing } from "./nurturing-engine.ts";

export interface DossierStoreOptions {
  dataDir: string;
}

export function stageDefaultAgent(stage: string): string {
  switch (stage) {
    case "new_enquiry":
    case "initial_conversation":
    case "patient_qualification":
    case "treatment_interest_identified":
    case "required_info_requested":
    case "lead_captured":
    case "contacted":
    case "qualified":
      return "nuvio_concierge";

    case "documents_pending":
    case "ready_for_clinical_review":
    case "consultation_requested":
    case "consultation_scheduled":
    case "consultation_completed":
    case "doctor_consultation":
    case "in_treatment":
    case "post_treatment_followup":
      return "nuvio_clinical";

    case "treatment_estimate_pending":
    case "estimate_shared":
    case "patient_decision_pending":
    case "converted_treatment_proceeding":
      return "nuvio_estimator";

    case "visa_assistance":
    case "travel_coordinated":
      return "nuvio_travel";

    case "lost_inactive":
    case "closed":
    default:
      return "nuvio_concierge";
  }
}

export class NuvioDossierStore {
  private readonly baseDir: string;
  private readonly dossiersDir: string;
  private readonly orgConfigFile: string;
  private readonly legacyHospitalConfigFile: string;
  private readonly tasksFile: string;
  private readonly commQueueFile: string;

  constructor(options: DossierStoreOptions) {
    this.baseDir = join(options.dataDir, "nuvio");
    this.dossiersDir = join(this.baseDir, "dossiers");
    this.orgConfigFile = join(this.baseDir, "organization-config.json");
    this.legacyHospitalConfigFile = join(this.baseDir, "hospital-config.json");
    this.tasksFile = join(this.baseDir, "tasks.json");
    this.commQueueFile = join(this.baseDir, "comm-queue.json");
    this.ensureDirs();
  }

  private ensureDirs(): void {
    if (!existsSync(this.baseDir)) mkdirSync(this.baseDir, { recursive: true });
    if (!existsSync(this.dossiersDir)) mkdirSync(this.dossiersDir, { recursive: true });
  }

  // --- Organization Config Operations ---

  getOrganizationConfig(): NuvioOrganizationConfig {
    this.ensureDirs();

    // 1. Check primary organization-config.json
    if (existsSync(this.orgConfigFile)) {
      try {
        const raw = readFileSync(this.orgConfigFile, "utf-8");
        return organizationConfigSchema.parse(JSON.parse(raw));
      } catch {
        // Fallback below
      }
    }

    // 2. Check legacy hospital-config.json
    if (existsSync(this.legacyHospitalConfigFile)) {
      try {
        const raw = readFileSync(this.legacyHospitalConfigFile, "utf-8");
        const parsed = JSON.parse(raw);
        const orgConfig = organizationConfigSchema.parse({
          ...parsed,
          organizationId: parsed.hospitalId || parsed.organizationId || "hospital_default",
          hospitalId: parsed.hospitalId || parsed.organizationId || "hospital_default",
          organizationName: parsed.hospitalName || parsed.organizationName || "Nuvio Partner Hospital",
          hospitalName: parsed.hospitalName || parsed.organizationName || "Nuvio Partner Hospital",
          organizationType: parsed.organizationType || "hospital",
        });
        this.saveOrganizationConfig(orgConfig);
        return orgConfig;
      } catch {
        // Fallback below
      }
    }

    // 3. Fallback to default
    this.saveOrganizationConfig(DEFAULT_ORGANIZATION_CONFIG);
    return DEFAULT_ORGANIZATION_CONFIG;
  }

  saveOrganizationConfig(config: NuvioOrganizationConfigInput): NuvioOrganizationConfig {
    this.ensureDirs();
    const validated = organizationConfigSchema.parse(config);
    writeFileAtomic(this.orgConfigFile, JSON.stringify(validated, null, 2));
    try {
      writeFileAtomic(this.legacyHospitalConfigFile, JSON.stringify(validated, null, 2));
    } catch {}
    return validated;
  }

  getHospitalConfig(): NuvioOrganizationConfig {
    return this.getOrganizationConfig();
  }

  saveHospitalConfig(config: NuvioOrganizationConfigInput): NuvioOrganizationConfig {
    return this.saveOrganizationConfig(config);
  }

  completeOnboarding(patch: NuvioOrganizationConfigInput): NuvioOrganizationConfig {
    const current = this.getOrganizationConfig();
    const orgName = (patch.organizationName || current.organizationName || "").trim();
    const merged: NuvioOrganizationConfigInput = {
      ...current,
      ...patch,
      organizationId: current.organizationId || "hospital_default",
      hospitalId: current.hospitalId || "hospital_default",
      organizationName: orgName,
      hospitalName: orgName,
      organizationType: patch.organizationType || current.organizationType || "hospital",
      onboardingCompleted: true,
    };
    return this.saveOrganizationConfig(merged);
  }

  // --- Patient Dossier CRUD Operations ---

  private dossierPath(patientId: string): string {
    const safeId = patientId.replace(/[^a-zA-Z0-9_-]/g, "_");
    return join(this.dossiersDir, `${safeId}.json`);
  }

  getDossier(patientId: string): NuvioPatientDossier | null {
    const path = this.dossierPath(patientId);
    if (!existsSync(path)) return null;
    try {
      const raw = readFileSync(path, "utf-8");
      return patientDossierSchema.parse(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  saveDossier(input: PatientDossierInput): NuvioPatientDossier {
    this.ensureDirs();
    const dossier = patientDossierSchema.parse(input);
    const path = this.dossierPath(dossier.patientId);
    writeFileAtomic(path, JSON.stringify(dossier, null, 2));
    return dossier;
  }

  listDossiers(): NuvioPatientDossier[] {
    this.ensureDirs();
    const files = readdirSync(this.dossiersDir).filter((f) => f.endsWith(".json"));
    const results: NuvioPatientDossier[] = [];
    for (const file of files) {
      try {
        const raw = readFileSync(join(this.dossiersDir, file), "utf-8");
        results.push(patientDossierSchema.parse(JSON.parse(raw)));
      } catch {
        // Skip corrupted or incomplete files
      }
    }
    return results.sort((a, b) => b.inquiryDate - a.inquiryDate);
  }

  // --- Duplicate Detection ---

  findDuplicate(phone?: string, email?: string): NuvioPatientDossier | null {
    if (!phone && !email) return null;
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, "") : null;
    const cleanEmail = email ? email.trim().toLowerCase() : null;

    const all = this.listDossiers();
    for (const dossier of all) {
      if (cleanEmail && dossier.personal.email && dossier.personal.email.trim().toLowerCase() === cleanEmail) {
        return dossier;
      }
      if (cleanPhone && dossier.personal.phone) {
        const storedPhone = dossier.personal.phone.replace(/[^0-9]/g, "");
        if (storedPhone.length > 5 && (storedPhone.endsWith(cleanPhone) || cleanPhone.endsWith(storedPhone))) {
          return dossier;
        }
      }
      if (cleanPhone && dossier.personal.whatsapp) {
        const storedWhatsApp = dossier.personal.whatsapp.replace(/[^0-9]/g, "");
        if (storedWhatsApp.length > 5 && (storedWhatsApp.endsWith(cleanPhone) || cleanPhone.endsWith(storedWhatsApp))) {
          return dossier;
        }
      }
    }
    return null;
  }

  // --- Stage Transition & Timeline Management ---

  transitionStage(
    patientId: string,
    targetStage: string,
    actor: string,
    note: string
  ): NuvioPatientDossier {
    const existing = this.getDossier(patientId);
    if (!existing) {
      throw new Error(`Patient dossier not found for ID: ${patientId}`);
    }

    if (!canTransitionStage(existing.stage, targetStage)) {
      throw new Error(`Invalid stage transition from ${existing.stage} to ${targetStage}`);
    }

    const event: TimelineEvent = {
      at: Date.now(),
      stage: targetStage,
      actor,
      note,
      eventType: "patient_stage_changed",
    };

    const nextAgent = stageDefaultAgent(targetStage);
    const updated: NuvioPatientDossier = {
      ...existing,
      stage: targetStage,
      activeAgent: nextAgent,
      timeline: [...existing.timeline, event],
    };

    return this.saveDossier(updated);
  }

  addCaseTimelineEvent(
    patientId: string,
    event: Omit<DetailedCaseEvent, "at"> & { at?: number }
  ): NuvioPatientDossier | null {
    const dossier = this.getDossier(patientId);
    if (!dossier) return null;

    const timelineEvent: TimelineEvent = {
      at: event.at || Date.now(),
      stage: event.stage || dossier.stage,
      actor: event.actor,
      note: event.note,
      eventType: event.eventType,
      requiresHumanApproval: event.requiresHumanApproval ?? false,
      approved: event.approved,
    };

    dossier.timeline.push(timelineEvent);
    return this.saveDossier(dossier);
  }

  // --- Follow-up Scheduling Subsystem (Phase 3C & 4) ---

  addFollowUp(
    patientId: string,
    followUp: Omit<FollowUp, "id" | "createdAt" | "status" | "assignedCoordinator"> & {
      id?: string;
      status?: FollowUp["status"];
      assignedCoordinator?: string;
    }
  ): NuvioPatientDossier {
    const dossier = this.getDossier(patientId);
    if (!dossier) throw new Error(`Patient dossier not found: ${patientId}`);

    const id = followUp.id || `fu_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const fullFollowUp = followUpSchema.parse({
      ...followUp,
      id,
      createdAt: Date.now(),
      status: followUp.status || "scheduled",
      assignedCoordinator: followUp.assignedCoordinator || "nuvio_concierge",
    });

    dossier.followUps.push(fullFollowUp);
    dossier.timeline.push({
      at: Date.now(),
      stage: dossier.stage,
      actor: fullFollowUp.assignedCoordinator,
      note: `Scheduled follow-up: "${fullFollowUp.reason}" due on ${new Date(fullFollowUp.dueDate).toLocaleDateString()}`,
      eventType: "follow_up_scheduled",
    });

    return this.saveDossier(dossier);
  }

  updateFollowUp(
    patientId: string,
    followUpId: string,
    patch: Partial<FollowUp>
  ): NuvioPatientDossier {
    const dossier = this.getDossier(patientId);
    if (!dossier) throw new Error(`Patient dossier not found: ${patientId}`);

    const index = dossier.followUps.findIndex((f) => f.id === followUpId);
    if (index === -1) throw new Error(`Follow-up ${followUpId} not found in dossier ${patientId}`);

    const existing = dossier.followUps[index]!;
    const updatedFollowUp = followUpSchema.parse({
      ...existing,
      ...patch,
      completedAt: patch.status === "completed" && !existing.completedAt ? Date.now() : existing.completedAt,
    });

    dossier.followUps[index] = updatedFollowUp;
    dossier.timeline.push({
      at: Date.now(),
      stage: dossier.stage,
      actor: updatedFollowUp.assignedCoordinator,
      note: `Follow-up ${followUpId} status updated to ${updatedFollowUp.status}`,
      eventType: "coordinator_action_completed",
    });

    return this.saveDossier(dossier);
  }

  // --- Consultation Coordination Subsystem (Phase 3D) ---

  requestConsultation(
    patientId: string,
    consultation: Omit<Consultation, "id" | "createdAt" | "schedulingStatus" | "mode"> & {
      id?: string;
      schedulingStatus?: Consultation["schedulingStatus"];
      mode?: Consultation["mode"];
    }
  ): NuvioPatientDossier {
    const dossier = this.getDossier(patientId);
    if (!dossier) throw new Error(`Patient dossier not found: ${patientId}`);

    const id = consultation.id || `cs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const fullConsultation = consultationSchema.parse({
      ...consultation,
      id,
      createdAt: Date.now(),
      schedulingStatus: consultation.schedulingStatus || "requested",
      mode: consultation.mode || "video",
    });

    dossier.consultations.push(fullConsultation);
    dossier.timeline.push({
      at: Date.now(),
      stage: dossier.stage,
      actor: "nuvio_concierge",
      note: `Consultation requested: ${fullConsultation.mode} mode with ${fullConsultation.doctorName || fullConsultation.department || 'specialist'} (Status: ${fullConsultation.schedulingStatus})`,
      eventType: "consultation_requested",
    });

    return this.saveDossier(dossier);
  }

  updateConsultation(
    patientId: string,
    consultationId: string,
    patch: Partial<Consultation>
  ): NuvioPatientDossier {
    const dossier = this.getDossier(patientId);
    if (!dossier) throw new Error(`Patient dossier not found: ${patientId}`);

    const index = dossier.consultations.findIndex((c) => c.id === consultationId);
    if (index === -1) throw new Error(`Consultation ${consultationId} not found in dossier ${patientId}`);

    const existing = dossier.consultations[index]!;
    const updated = consultationSchema.parse({
      ...existing,
      ...patch,
    });

    dossier.consultations[index] = updated;
    dossier.timeline.push({
      at: Date.now(),
      stage: dossier.stage,
      actor: "coordinator",
      note: `Consultation ${consultationId} updated to ${updated.schedulingStatus}${updated.confirmedDateTime ? ` (Confirmed for ${updated.confirmedDateTime})` : ""}`,
      eventType: updated.schedulingStatus === "confirmed" ? "consultation_confirmed" : "coordinator_action_completed",
      requiresHumanApproval: true,
      approved: updated.schedulingStatus === "confirmed",
    });

    return this.saveDossier(dossier);
  }

  // --- Document Coordination Subsystem (Phase 3D) ---

  requestDocument(
    patientId: string,
    doc: Omit<PatientDocument, "id" | "requestedAt" | "status" | "isClinicianVerified"> & {
      id?: string;
      status?: PatientDocument["status"];
    }
  ): NuvioPatientDossier {
    const dossier = this.getDossier(patientId);
    if (!dossier) throw new Error(`Patient dossier not found: ${patientId}`);

    const id = doc.id || `doc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const fullDoc = patientDocumentSchema.parse({
      ...doc,
      id,
      requestedAt: Date.now(),
      status: doc.status || "requested",
      isClinicianVerified: false,
    });

    dossier.documents.push(fullDoc);
    dossier.timeline.push({
      at: Date.now(),
      stage: dossier.stage,
      actor: "nuvio_clinical",
      note: `Requested medical document: "${fullDoc.name}" (${fullDoc.category})`,
      eventType: "document_requested",
    });

    return this.saveDossier(dossier);
  }

  updateDocumentStatus(
    patientId: string,
    documentId: string,
    patch: Partial<PatientDocument>
  ): NuvioPatientDossier {
    const dossier = this.getDossier(patientId);
    if (!dossier) throw new Error(`Patient dossier not found: ${patientId}`);

    const index = dossier.documents.findIndex((d) => d.id === documentId);
    if (index === -1) throw new Error(`Document ${documentId} not found in dossier ${patientId}`);

    const existing = dossier.documents[index]!;
    const updated = patientDocumentSchema.parse({
      ...existing,
      ...patch,
      receivedAt: patch.status === "received" && !existing.receivedAt ? Date.now() : existing.receivedAt,
      reviewedAt: (patch.status === "accepted" || patch.status === "under_review") && !existing.reviewedAt ? Date.now() : existing.reviewedAt,
    });

    dossier.documents[index] = updated;
    dossier.timeline.push({
      at: Date.now(),
      stage: dossier.stage,
      actor: patch.reviewedBy || "clinical_team",
      note: `Document "${updated.name}" updated to ${updated.status}${updated.isClinicianVerified ? " [Clinician Verified]" : ""}`,
      eventType: updated.status === "received" ? "document_received" : "coordinator_action_completed",
      requiresHumanApproval: updated.isClinicianVerified,
      approved: updated.isClinicianVerified,
    });

    return this.saveDossier(dossier);
  }

  // --- Coordinator Tasks Management (Phase 4) ---

  listTasks(filter?: {
    status?: TaskStatus;
    priority?: TaskPriority;
    patientId?: string;
    category?: TaskCategory;
  }): CoordinatorTask[] {
    this.ensureDirs();
    if (!existsSync(this.tasksFile)) return [];
    try {
      const raw = readFileSync(this.tasksFile, "utf-8");
      const all = JSON.parse(raw) as CoordinatorTask[];
      return all
        .filter((t) => {
          if (filter?.status && t.status !== filter.status) return false;
          if (filter?.priority && t.priority !== filter.priority) return false;
          if (filter?.patientId && t.patientId !== filter.patientId) return false;
          if (filter?.category && t.category !== filter.category) return false;
          return true;
        })
        .sort((a, b) => {
          // Sort urgent first, then due date
          const priorityWeight = { urgent: 0, high: 1, medium: 2, low: 3 };
          const pDiff = (priorityWeight[a.priority] ?? 2) - (priorityWeight[b.priority] ?? 2);
          if (pDiff !== 0) return pDiff;
          return a.dueDate - b.dueDate;
        });
    } catch {
      return [];
    }
  }

  createTask(input: Omit<CoordinatorTask, "id" | "createdAt"> & { id?: string }): CoordinatorTask {
    this.ensureDirs();
    const all = this.listTasks();
    const id = input.id || `tsk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const task = coordinatorTaskSchema.parse({
      ...input,
      id,
      createdAt: Date.now(),
      status: input.status || "pending",
    });

    all.push(task);
    writeFileAtomic(this.tasksFile, JSON.stringify(all, null, 2));

    // Record in patient timeline
    this.addCaseTimelineEvent(task.patientId, {
      stage: "task_created",
      eventType: "task_created",
      actor: "lead_nurturing_engine",
      note: `Task created for coordinator: "${task.title}" (Priority: ${task.priority})`,
      requiresHumanApproval: true,
    });

    return task;
  }

  updateTask(taskId: string, patch: Partial<CoordinatorTask>): CoordinatorTask {
    this.ensureDirs();
    const all = this.listTasks();
    const index = all.findIndex((t) => t.id === taskId);
    if (index === -1) throw new Error(`Coordinator task not found: ${taskId}`);

    const existing = all[index]!;
    const updated = coordinatorTaskSchema.parse({
      ...existing,
      ...patch,
      completedAt: patch.status === "completed" && !existing.completedAt ? Date.now() : existing.completedAt,
    });

    all[index] = updated;
    writeFileAtomic(this.tasksFile, JSON.stringify(all, null, 2));

    if (updated.status === "completed") {
      this.addCaseTimelineEvent(updated.patientId, {
        stage: "task_completed",
        eventType: "task_completed",
        actor: updated.completedBy || "coordinator",
        note: `Coordinator completed task: "${updated.title}"${updated.resolutionNotes ? ` (${updated.resolutionNotes})` : ""}`,
      });
    }

    return updated;
  }

  completeTask(taskId: string, completedBy: string, resolutionNotes?: string): CoordinatorTask {
    return this.updateTask(taskId, {
      status: "completed",
      completedBy,
      resolutionNotes,
    });
  }

  // --- Patient Communication Queue Management (Phase 4) ---

  listCommunicationQueue(filter?: {
    status?: CommunicationStatus;
    patientId?: string;
  }): CommunicationQueueItem[] {
    this.ensureDirs();
    if (!existsSync(this.commQueueFile)) return [];
    try {
      const raw = readFileSync(this.commQueueFile, "utf-8");
      const all = JSON.parse(raw) as CommunicationQueueItem[];
      return all
        .filter((item) => {
          if (filter?.status && item.status !== filter.status) return false;
          if (filter?.patientId && item.patientId !== filter.patientId) return false;
          return true;
        })
        .sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return [];
    }
  }

  createCommunicationDraft(
    input: Omit<CommunicationQueueItem, "id" | "createdAt" | "status"> & {
      id?: string;
      status?: CommunicationStatus;
    }
  ): CommunicationQueueItem {
    this.ensureDirs();
    const all = this.listCommunicationQueue();
    const id = input.id || `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const item = communicationQueueItemSchema.parse({
      ...input,
      id,
      createdAt: Date.now(),
      status: input.status || "pending_review",
    });

    all.push(item);
    writeFileAtomic(this.commQueueFile, JSON.stringify(all, null, 2));

    this.addCaseTimelineEvent(item.patientId, {
      stage: item.relatedStage,
      eventType: "communication_drafted",
      actor: "nuvio_concierge",
      note: `Drafted patient message for review (${item.purpose}): "${item.draftMessage}"`,
      requiresHumanApproval: true,
      approved: false,
    });

    return item;
  }

  updateCommunicationDraft(
    draftId: string,
    patch: Partial<CommunicationQueueItem>
  ): CommunicationQueueItem {
    this.ensureDirs();
    const all = this.listCommunicationQueue();
    const index = all.findIndex((d) => d.id === draftId);
    if (index === -1) throw new Error(`Communication draft not found: ${draftId}`);

    const existing = all[index]!;
    const updated = communicationQueueItemSchema.parse({
      ...existing,
      ...patch,
    });

    all[index] = updated;
    writeFileAtomic(this.commQueueFile, JSON.stringify(all, null, 2));
    return updated;
  }

  approveCommunicationDraft(draftId: string, reviewedBy: string): CommunicationQueueItem {
    const updated = this.updateCommunicationDraft(draftId, {
      status: "approved",
      reviewedAt: Date.now(),
      reviewedBy,
    });

    this.addCaseTimelineEvent(updated.patientId, {
      stage: updated.relatedStage,
      eventType: "communication_approved",
      actor: reviewedBy,
      note: `Coordinator approved communication draft (${updated.purpose}) for ${updated.patientName}`,
      requiresHumanApproval: true,
      approved: true,
    });

    return updated;
  }

  rejectCommunicationDraft(
    draftId: string,
    reviewedBy: string,
    rejectionReason?: string
  ): CommunicationQueueItem {
    const updated = this.updateCommunicationDraft(draftId, {
      status: "rejected",
      reviewedAt: Date.now(),
      reviewedBy,
      rejectionReason,
    });

    this.addCaseTimelineEvent(updated.patientId, {
      stage: updated.relatedStage,
      eventType: "communication_rejected",
      actor: reviewedBy,
      note: `Coordinator rejected communication draft (${updated.purpose}): "${rejectionReason || 'No reason specified'}"`,
      requiresHumanApproval: true,
      approved: false,
    });

    return updated;
  }

  // --- Lead Nurturing Runner (Phase 4) ---

  runNurturingAutomation(patientId?: string): {
    generatedTasks: CoordinatorTask[];
    generatedDrafts: CommunicationQueueItem[];
  } {
    const config = this.getOrganizationConfig();
    const dossiers = patientId ? [this.getDossier(patientId)].filter(Boolean) as NuvioPatientDossier[] : this.listDossiers();

    const existingTasks = this.listTasks();
    const existingDrafts = this.listCommunicationQueue();

    const allNewTasks: CoordinatorTask[] = [];
    const allNewDrafts: CommunicationQueueItem[] = [];

    for (const dossier of dossiers) {
      const { newTasks, newDrafts } = evaluateDossierNurturing(
        dossier,
        config,
        [...existingTasks, ...allNewTasks],
        [...existingDrafts, ...allNewDrafts]
      );

      for (const t of newTasks) {
        const created = this.createTask(t);
        allNewTasks.push(created);
      }

      for (const d of newDrafts) {
        const created = this.createCommunicationDraft(d);
        allNewDrafts.push(created);
      }
    }

    return { generatedTasks: allNewTasks, generatedDrafts: allNewDrafts };
  }

  // --- Search and Filter Workspace Queries (Phase 4) ---

  searchAndFilterDossiers(query: OperationsFilterQuery): NuvioPatientDossier[] {
    const all = this.listDossiers();
    const now = Date.now();

    return all.filter((d) => {
      // 1. Text Search across name, phone, email, patientId
      if (query.search && query.search.trim().length > 0) {
        const s = query.search.trim().toLowerCase();
        const matchName = d.personal.name.toLowerCase().includes(s);
        const matchId = d.patientId.toLowerCase().includes(s);
        const matchPhone = d.personal.phone?.toLowerCase().includes(s);
        const matchEmail = d.personal.email?.toLowerCase().includes(s);
        const matchSpecialty = d.clinical.specialty?.toLowerCase().includes(s);
        if (!matchName && !matchId && !matchPhone && !matchEmail && !matchSpecialty) {
          return false;
        }
      }

      // 2. Journey Stage Filter
      if (query.stage && d.stage !== query.stage) {
        return false;
      }

      // 3. Coordinator Filter
      if (query.coordinator && d.activeAgent !== query.coordinator) {
        return false;
      }

      // 4. Overdue Follow-ups
      if (query.hasOverdueFollowups) {
        const hasOverdue = (d.followUps || []).some(
          (fu) => fu.status === "scheduled" && fu.dueDate < now
        );
        if (!hasOverdue) return false;
      }

      // 5. Pending Documents
      if (query.hasPendingDocuments) {
        const hasPendingDocs = (d.documents || []).some(
          (doc) => doc.status === "requested" || doc.status === "received" || doc.status === "under_review"
        );
        if (!hasPendingDocs) return false;
      }

      // 6. Consultation Requests
      if (query.hasConsultationRequests) {
        const hasConsults = (d.consultations || []).some(
          (c) => c.schedulingStatus === "requested" || c.schedulingStatus === "coordinator_review"
        );
        if (!hasConsults) return false;
      }

      // 7. Needs Response
      if (query.needsResponse) {
        const hasReplied = d.timeline.some(
          (ev) => ev.actor !== "system" && ev.actor !== "nuvio_concierge" && ev.eventType === "patient_replied"
        );
        const isNew = d.stage === "new_enquiry" || d.stage === "lead_captured";
        if (!isNew || hasReplied) return false;
      }

      return true;
    });
  }
}
