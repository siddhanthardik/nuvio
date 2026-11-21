/**
 * Nuvio Medical Tourism Platform - Lead Nurturing & Follow-Up Automation Engine
 * Evaluates patient dossiers against organization configuration, active capabilities,
 * and timeline milestones to generate idempotent coordinator tasks and communication drafts.
 */
import type { NuvioOrganizationConfig } from "../../shared/nuvio/organization-config.ts";
import type { NuvioPatientDossier } from "../../shared/nuvio/patient-journey.ts";
import type {
  CoordinatorTask,
  CommunicationQueueItem,
} from "../../shared/nuvio/patient-operations.ts";

export interface NurturingEvaluationResult {
  newTasks: Array<Omit<CoordinatorTask, "id" | "createdAt">>;
  newDrafts: Array<Omit<CommunicationQueueItem, "id" | "createdAt">>;
}

export function evaluateDossierNurturing(
  dossier: NuvioPatientDossier,
  config: NuvioOrganizationConfig,
  existingTasks: CoordinatorTask[],
  existingDrafts: CommunicationQueueItem[]
): NurturingEvaluationResult {
  const newTasks: Array<Omit<CoordinatorTask, "id" | "createdAt">> = [];
  const newDrafts: Array<Omit<CommunicationQueueItem, "id" | "createdAt">> = [];

  const now = Date.now();
  const enabledCaps = new Set(config.enabledCapabilities || []);

  // Filter tasks and drafts relevant to this patient
  const patientTasks = existingTasks.filter((t) => t.patientId === dossier.patientId);
  const patientDrafts = existingDrafts.filter((d) => d.patientId === dossier.patientId);

  // Helper: check if active task of category already exists
  const hasActiveTask = (category: string) =>
    patientTasks.some((t) => t.category === category && (t.status === "pending" || t.status === "in_progress"));

  // Helper: check if pending draft of purpose already exists
  const hasActiveDraft = (purpose: string) =>
    patientDrafts.some((d) => d.purpose === purpose && (d.status === "pending_review" || d.status === "approved"));

  // --- RULE 1: New Enquiry Handling ---
  if (
    enabledCaps.has("lead_qualification") &&
    (dossier.stage === "new_enquiry" || dossier.stage === "lead_captured")
  ) {
    // Check if any human response or coordinator contact occurred
    const hasCoordinatorResponded = dossier.timeline.some(
      (ev) => ev.actor !== "system" && ev.actor !== "nuvio_concierge" && ev.eventType === "patient_replied"
    );

    if (!hasCoordinatorResponded && !hasActiveTask("enquiry_review")) {
      newTasks.push({
        patientId: dossier.patientId,
        title: `Review new patient enquiry: ${dossier.personal.name}`,
        description: `New enquiry captured from ${dossier.leadSource}. Complaint: "${dossier.clinical.primaryComplaint || 'Not specified'}". Qualify patient needs and approve initial response.`,
        category: "enquiry_review",
        priority: "urgent",
        status: "pending",
        assignedCoordinator: dossier.activeAgent || "nuvio_concierge",
        dueDate: dossier.inquiryDate + 2 * 3600 * 1000, // Due in 2 hours
      });
    }

    if (!hasActiveDraft("inquiry_welcome")) {
      const orgName = config.organizationName;
      newDrafts.push({
        patientId: dossier.patientId,
        patientName: dossier.personal.name,
        purpose: "inquiry_welcome",
        draftMessage: `Hello ${dossier.personal.name}, thank you for reaching out to ${orgName}. I can help you coordinate your ${dossier.clinical.specialty || "medical"} care. Could you share if you have recent medical reports available?`,
        language: dossier.personal.primaryLanguage || "English",
        relatedStage: dossier.stage,
        status: "pending_review",
        channel: dossier.personal.whatsapp ? "whatsapp" : "email",
        scheduledTime: now,
      });
    }
  }

  // --- RULE 2: Document Collection & Verification ---
  if (enabledCaps.has("document_collection") && Array.isArray(dossier.documents)) {
    for (const doc of dossier.documents) {
      // 2a. Pending document requested > 24 hours ago
      const isOverdue = doc.status === "requested" && now - doc.requestedAt >= 24 * 3600 * 1000;
      if (isOverdue && !hasActiveTask("patient_followup") && !hasActiveDraft("document_reminder")) {
        newTasks.push({
          patientId: dossier.patientId,
          title: `Follow up on pending document: ${doc.name} (${dossier.personal.name})`,
          description: `Document "${doc.name}" was requested on ${new Date(doc.requestedAt).toLocaleDateString()} but has not been uploaded.`,
          category: "patient_followup",
          priority: "high",
          status: "pending",
          assignedCoordinator: "nuvio_concierge",
          dueDate: now + 12 * 3600 * 1000,
        });

        newDrafts.push({
          patientId: dossier.patientId,
          patientName: dossier.personal.name,
          purpose: "document_reminder",
          draftMessage: `Hello ${dossier.personal.name}, I wanted to check whether you were able to obtain the ${doc.name}. Once we receive it, our clinical team can proceed with your case review.`,
          language: dossier.personal.primaryLanguage || "English",
          relatedStage: "documents_pending",
          status: "pending_review",
          channel: "whatsapp",
          scheduledTime: now,
        });
      }

      // 2b. Document received but clinician verification pending
      if (doc.status === "received" && !doc.isClinicianVerified && !hasActiveTask("document_verification")) {
        newTasks.push({
          patientId: dossier.patientId,
          title: `Verify uploaded document: ${doc.name} (${dossier.personal.name})`,
          description: `Patient uploaded "${doc.name}". Authorized clinical review is required before sharing with consultant physicians.`,
          category: "document_verification",
          priority: "high",
          status: "pending",
          assignedCoordinator: config.agents.nuvio_clinical.displayName || "Dr. Aarti",
          dueDate: now + 24 * 3600 * 1000,
        });
      }
    }
  }

  // --- RULE 3: Consultation Coordination ---
  if (enabledCaps.has("consultation_coordination") && Array.isArray(dossier.consultations)) {
    for (const consult of dossier.consultations) {
      if (
        (consult.schedulingStatus === "requested" || consult.schedulingStatus === "coordinator_review") &&
        !hasActiveTask("consultation_scheduling")
      ) {
        newTasks.push({
          patientId: dossier.patientId,
          title: `Coordinate ${consult.mode} consultation for ${dossier.personal.name}`,
          description: `Consultation requested with ${consult.doctorName || consult.department || 'specialist'}. Preferred timing: "${consult.preferredTimeSlot || consult.requestedDate || 'Flexible'}". Confirm doctor availability and lock schedule.`,
          category: "consultation_scheduling",
          priority: "high",
          status: "pending",
          assignedCoordinator: "nuvio_concierge",
          dueDate: now + 24 * 3600 * 1000,
        });
      }
    }
  }

  // --- RULE 4: Treatment Estimate Pending ---
  if (
    enabledCaps.has("estimate_coordination") &&
    (dossier.stage === "treatment_estimate_pending" ||
      (dossier.stage === "estimate_shared" && !dossier.estimate.approvedByCoordinator)) &&
    !hasActiveTask("treatment_estimate")
  ) {
    newTasks.push({
      patientId: dossier.patientId,
      title: `Prepare treatment estimate for ${dossier.personal.name}`,
      description: `Compile surgeon fee, operating theater charges, and bed days in ${dossier.estimate.currency || config.defaultCurrency}. Human coordinator approval is required before sharing.`,
      category: "treatment_estimate",
      priority: "medium",
      status: "pending",
      assignedCoordinator: config.agents.nuvio_estimator.displayName || "Pramesh",
      dueDate: now + 48 * 3600 * 1000,
    });
  }

  // --- RULE 5: Inactive Lead Re-engagement ---
  const lastEvent = dossier.timeline[dossier.timeline.length - 1];
  const lastActiveTime = lastEvent ? lastEvent.at : dossier.inquiryDate;
  const isInactive = now - lastActiveTime >= 3 * 24 * 3600 * 1000; // 3 days
  const isTerminated = dossier.stage === "closed" || dossier.stage === "lost_inactive";

  if (isInactive && !isTerminated && !hasActiveTask("re_engagement") && !hasActiveDraft("re_engagement")) {
    newTasks.push({
      patientId: dossier.patientId,
      title: `Re-engage inactive patient: ${dossier.personal.name}`,
      description: `No patient response recorded since ${new Date(lastActiveTime).toLocaleDateString()}. Follow up to verify if they still require medical care or assistance.`,
      category: "re_engagement",
      priority: "low",
      status: "pending",
      assignedCoordinator: config.agents.nuvio_followup?.displayName || "Pooja",
      dueDate: now + 24 * 3600 * 1000,
    });

    newDrafts.push({
      patientId: dossier.patientId,
      patientName: dossier.personal.name,
      purpose: "re_engagement",
      draftMessage: `Hello ${dossier.personal.name}, I am following up regarding your inquiry with ${config.organizationName}. Please let us know if you still require assistance with your treatment coordination.`,
      language: dossier.personal.primaryLanguage || "English",
      relatedStage: dossier.stage,
      status: "pending_review",
      channel: "whatsapp",
      scheduledTime: now,
    });
  }

  // --- RULE 6: Visa & Travel Logistics Coordination ---
  if (
    enabledCaps.has("visa_travel_coordination") &&
    (dossier.stage === "visa_travel_coordination" ||
      dossier.stage === "visa_assistance" ||
      dossier.stage === "converted_treatment_proceeding") &&
    !dossier.visaTravel.visaInvitationIssued &&
    !hasActiveTask("visa_letter_review")
  ) {
    newTasks.push({
      patientId: dossier.patientId,
      title: `Prepare medical visa invitation letter for ${dossier.personal.name}`,
      description: `Patient confirmed treatment. Compile passport details, hospital guarantee, and embassy invitation letter for human coordinator approval.`,
      category: "visa_letter_review",
      priority: "high",
      status: "pending",
      assignedCoordinator: config.agents.nuvio_travel?.displayName || "Mahesh",
      dueDate: now + 24 * 3600 * 1000,
    });
  }

  return { newTasks, newDrafts };
}
