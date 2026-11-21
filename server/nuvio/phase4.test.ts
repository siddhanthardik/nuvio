import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { NuvioDossierStore } from "./dossier-store.ts";
import { ingestInquiry } from "./workflow.ts";
import { evaluateDossierNurturing } from "./nurturing-engine.ts";

function createTestStore(): { store: NuvioDossierStore; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "nuvio-p4-test-"));
  const store = new NuvioDossierStore({ dataDir: dir });
  return {
    store,
    cleanup: () => {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {}
    },
  };
}

describe("Nuvio Phase 4: Patient Operations & Lead Nurturing Automation", () => {
  // 1. New enquiry operational task & communication draft
  it("creates an urgent enquiry_review task and a welcome draft for a new enquiry", () => {
    const { store, cleanup } = createTestStore();
    try {
      const intake = ingestInquiry(store, {
        name: "Adnan Chowdhury",
        country: "Bangladesh",
        phone: "+880 1711 998877",
        specialty: "Cardiology",
        complaint: "Triple vessel coronary artery disease, needs surgical estimate",
        source: "whatsapp",
      });

      // Run lead nurturing automation
      const { generatedTasks, generatedDrafts } = store.runNurturingAutomation(intake.dossier.patientId);

      expect(generatedTasks.length).toBeGreaterThanOrEqual(1);
      const reviewTask = generatedTasks.find((t) => t.category === "enquiry_review");
      expect(reviewTask).toBeDefined();
      expect(reviewTask?.priority).toBe("urgent");
      expect(reviewTask?.patientId).toBe(intake.dossier.patientId);

      expect(generatedDrafts.length).toBeGreaterThanOrEqual(1);
      const welcomeDraft = generatedDrafts.find((d) => d.purpose === "inquiry_welcome");
      expect(welcomeDraft).toBeDefined();
      expect(welcomeDraft?.status).toBe("pending_review");
      expect(welcomeDraft?.draftMessage).toContain("Adnan Chowdhury");
      // Check message length: 1-3 short sentences
      const sentences = welcomeDraft!.draftMessage.split(/[.!?]+/).filter((s) => s.trim().length > 0);
      expect(sentences.length).toBeLessThanOrEqual(3);
    } finally {
      cleanup();
    }
  });

  // 2. Pending documents generate appropriate follow-up tasks
  it("generates document follow-up task and reminder draft when documents are pending > 24 hours", () => {
    const { store, cleanup } = createTestStore();
    try {
      const intake = ingestInquiry(store, {
        name: "Khadija Al-Balushi",
        country: "Oman",
        email: "khadija@example.com",
        source: "website",
      });

      const patientId = intake.dossier.patientId;

      // Add document requested 30 hours ago
      const thirtyHoursAgo = Date.now() - 30 * 3600 * 1000;
      const dossier = store.getDossier(patientId)!;
      dossier.documents.push({
        id: "doc_test_1",
        name: "Coronary Angiogram CD & Report",
        category: "imaging_scan",
        status: "requested",
        requestedAt: thirtyHoursAgo,
        isClinicianVerified: false,
      });
      store.saveDossier(dossier);

      // Run nurturing
      const { generatedTasks, generatedDrafts } = store.runNurturingAutomation(patientId);

      const docFollowupTask = generatedTasks.find((t) => t.category === "patient_followup");
      expect(docFollowupTask).toBeDefined();
      expect(docFollowupTask?.title).toContain("Coronary Angiogram");

      const docReminderDraft = generatedDrafts.find((d) => d.purpose === "document_reminder");
      expect(docReminderDraft).toBeDefined();
      expect(docReminderDraft?.draftMessage).toContain("Coronary Angiogram");
    } finally {
      cleanup();
    }
  });

  // 3. Disabled workflow capabilities prevent corresponding automation
  it("respects disabled workflow capabilities and avoids generating tasks for disabled features", () => {
    const { store, cleanup } = createTestStore();
    try {
      // Disable document_collection and consultation_coordination
      store.saveOrganizationConfig({
        organizationType: "hospital",
        organizationName: "Test Facility",
        enabledCapabilities: ["lead_qualification", "estimate_coordination"], // document_collection & consultation omitted
      });

      const intake = ingestInquiry(store, {
        name: "Samuel Osei",
        country: "Ghana",
        source: "email",
      });

      const patientId = intake.dossier.patientId;
      const dossier = store.getDossier(patientId)!;

      // Add pending doc and requested consultation
      dossier.documents.push({
        id: "doc_samuel",
        name: "Biopsy Histopathology Report",
        category: "medical_report",
        status: "requested",
        requestedAt: Date.now() - 48 * 3600 * 1000,
        isClinicianVerified: false,
      });
      dossier.consultations.push({
        id: "cs_samuel",
        mode: "video",
        schedulingStatus: "requested",
        createdAt: Date.now(),
      });
      store.saveDossier(dossier);

      const config = store.getOrganizationConfig();
      const result = evaluateDossierNurturing(dossier, config, [], []);

      // No document or consultation tasks should be generated
      const hasDocTask = result.newTasks.some((t) => t.category === "patient_followup" || t.category === "document_verification");
      const hasConsultTask = result.newTasks.some((t) => t.category === "consultation_scheduling");

      expect(hasDocTask).toBe(false);
      expect(hasConsultTask).toBe(false);
    } finally {
      cleanup();
    }
  });

  // 4. Idempotency: duplicate events do not create duplicate tasks
  it("prevents duplicate tasks and drafts when nurturing rules are executed repeatedly", () => {
    const { store, cleanup } = createTestStore();
    try {
      const intake = ingestInquiry(store, {
        name: "Maria Gonzalez",
        country: "Mexico",
        source: "website",
      });

      const patientId = intake.dossier.patientId;

      // Run 1
      const firstRun = store.runNurturingAutomation(patientId);
      expect(firstRun.generatedTasks.length).toBeGreaterThan(0);

      // Run 2 immediately after
      const secondRun = store.runNurturingAutomation(patientId);
      expect(secondRun.generatedTasks.length).toBe(0);
      expect(secondRun.generatedDrafts.length).toBe(0);
    } finally {
      cleanup();
    }
  });

  // 5. Completed tasks are not repeatedly regenerated
  it("does not regenerate tasks that have already been completed by the coordinator", () => {
    const { store, cleanup } = createTestStore();
    try {
      const intake = ingestInquiry(store, {
        name: "Tariq Aziz",
        country: "Iraq",
        source: "whatsapp",
      });

      const patientId = intake.dossier.patientId;
      store.runNurturingAutomation(patientId);

      const tasks = store.listTasks({ patientId, category: "enquiry_review" });
      expect(tasks.length).toBe(1);

      // Complete the task
      store.completeTask(tasks[0]!.id, "Senior Coordinator", "Patient contacted and qualified");

      // Verify task status is completed
      const updatedTasks = store.listTasks({ patientId, category: "enquiry_review" });
      expect(updatedTasks[0]?.status).toBe("completed");

      // Re-run nurturing: should NOT create a second enquiry_review task
      // Simulate that coordinator has now responded in timeline
      const updatedDossier = store.getDossier(patientId)!;
      updatedDossier.timeline.push({
        at: Date.now(),
        stage: "patient_qualification",
        actor: "Senior Coordinator",
        note: "Spoke with patient via WhatsApp",
        eventType: "patient_replied",
      });
      store.saveDossier(updatedDossier);

      const rerun = store.runNurturingAutomation(patientId);
      const newEnquiryTasks = rerun.generatedTasks.filter((t) => t.category === "enquiry_review");
      expect(newEnquiryTasks.length).toBe(0);
    } finally {
      cleanup();
    }
  });

  // 6. Communication drafts remain pending until explicit coordinator approval
  it("requires coordinator review for drafts and records approval or rejection in timeline", () => {
    const { store, cleanup } = createTestStore();
    try {
      const intake = ingestInquiry(store, {
        name: "Amina Yusuf",
        country: "Somalia",
        source: "whatsapp",
      });

      const draft = store.createCommunicationDraft({
        patientId: intake.dossier.patientId,
        patientName: "Amina Yusuf",
        purpose: "follow_up_checkin",
        draftMessage: "Hello Amina, I wanted to check if you have any questions regarding your treatment options.",
        language: "English",
        relatedStage: "patient_qualification",
        channel: "whatsapp",
      });

      expect(draft.status).toBe("pending_review");

      // Approve draft
      const approved = store.approveCommunicationDraft(draft.id, "Dr. Aarti");
      expect(approved.status).toBe("approved");
      expect(approved.reviewedBy).toBe("Dr. Aarti");

      // Verify audit event recorded in timeline
      const dossier = store.getDossier(intake.dossier.patientId)!;
      const lastTimeline = dossier.timeline[dossier.timeline.length - 1];
      expect(lastTimeline?.eventType).toBe("communication_approved");
      expect(lastTimeline?.approved).toBe(true);
    } finally {
      cleanup();
    }
  });

  // 7. Operations Search and Filter Query Engine
  it("filters patient cases by search terms, overdue follow-ups, pending documents, and consultation requests", () => {
    const { store, cleanup } = createTestStore();
    try {
      // Patient A: Has overdue follow-up
      const pA = ingestInquiry(store, {
        name: "Arthur Pendelton",
        country: "UK",
        email: "arthur@example.co.uk",
        source: "website",
      });
      store.addFollowUp(pA.dossier.patientId, {
        dueDate: Date.now() - 3600 * 1000, // Due in the past
        reason: "Review preliminary test results",
        nextAction: "Email check-in",
      });

      // Patient B: Has pending document
      const pB = ingestInquiry(store, {
        name: "Fatima Al-Sayed",
        country: "Egypt",
        phone: "+20 100 1234567",
        source: "whatsapp",
      });
      store.requestDocument(pB.dossier.patientId, {
        name: "Abdominal Ultrasound Report",
        category: "imaging_scan",
      });

      // Search by text
      const searchRes = store.searchAndFilterDossiers({ search: "Arthur" });
      expect(searchRes.length).toBe(1);
      expect(searchRes[0]?.personal.name).toBe("Arthur Pendelton");

      // Filter by overdue follow-ups
      const overdueRes = store.searchAndFilterDossiers({ hasOverdueFollowups: true });
      expect(overdueRes.some((p) => p.patientId === pA.dossier.patientId)).toBe(true);
      expect(overdueRes.some((p) => p.patientId === pB.dossier.patientId)).toBe(false);

      // Filter by pending documents
      const docsRes = store.searchAndFilterDossiers({ hasPendingDocuments: true });
      expect(docsRes.some((p) => p.patientId === pB.dossier.patientId)).toBe(true);
      expect(docsRes.some((p) => p.patientId === pA.dossier.patientId)).toBe(false);
    } finally {
      cleanup();
    }
  });
});
