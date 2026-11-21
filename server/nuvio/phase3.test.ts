import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { NuvioDossierStore } from "./dossier-store.ts";
import { ingestInquiry } from "./workflow.ts";
import { generateConciergeResponse } from "./concierge.ts";
import { computeDashboardMetrics } from "./dashboard.ts";
import {
  buildConciergePrompt,
  buildOrganizationBehaviorGuidance,
} from "./prompts.ts";

function createTestStore(): { store: NuvioDossierStore; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "nuvio-p3-test-"));
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

describe("Nuvio Phase 3: Organization-Aware Workforce & Patient Coordination", () => {
  // --- Phase 3A: Organization-Aware Setup ---
  describe("Phase 3A: Organization Setup & Persistence", () => {
    it("initializes default organization configuration with hospital profile and Siddhant", () => {
      const { store, cleanup } = createTestStore();
      try {
        const config = store.getOrganizationConfig();
        expect(config.organizationType).toBe("hospital");
        expect(config.organizationName).toBe("Nuvio Partner Hospital");
        expect(config.agents.nuvio_concierge.displayName).toBe("Siddhant");
        expect(config.agents.nuvio_clinical.displayName).toBe("Dr. Aarti");
        expect(config.safetyGuards.maxSentencesPerMessage).toBe(3);
        expect(config.onboardingCompleted).toBe(false);
      } finally {
        cleanup();
      }
    });

    it("completes setup wizard onboarding for a Medical Tourism Company", () => {
      const { store, cleanup } = createTestStore();
      try {
        const completed = store.completeOnboarding({
          organizationType: "medical_tourism_company",
          organizationName: "GlobalCare Health Tourism",
          country: "Turkey",
          operatingLocation: "Istanbul",
          contactWhatsApp: "+90 555 123 4567",
          contactEmail: "intake@globalcare.example.com",
          defaultCurrency: "EUR",
          communicationStyle: "warm_professional",
          partnerHospitals: [
            {
              id: "hosp_anadolu",
              name: "Anadolu Medical Center",
              city: "Istanbul",
              country: "Turkey",
              accreditations: ["JCI"],
              specialties: ["Oncology", "Bone Marrow"],
              isPreferred: true,
            },
          ],
        });

        expect(completed.onboardingCompleted).toBe(true);
        expect(completed.organizationType).toBe("medical_tourism_company");
        expect(completed.organizationName).toBe("GlobalCare Health Tourism");
        expect(completed.defaultCurrency).toBe("EUR");
        expect(completed.partnerHospitals.length).toBe(1);

        // Verify persistence across reload
        const reloaded = store.getOrganizationConfig();
        expect(reloaded.organizationName).toBe("GlobalCare Health Tourism");
        expect(reloaded.onboardingCompleted).toBe(true);
        expect(reloaded.partnerHospitals[0]?.name).toBe("Anadolu Medical Center");
      } finally {
        cleanup();
      }
    });

    it("completes setup wizard onboarding for an Independent Medical Coordinator", () => {
      const { store, cleanup } = createTestStore();
      try {
        const completed = store.completeOnboarding({
          organizationType: "independent_coordinator",
          organizationName: "Dr. Al-Hashemi Patient Advocacy",
          country: "UAE",
          operatingLocation: "Dubai",
          defaultCurrency: "USD",
          communicationStyle: "concise_direct",
        });

        expect(completed.organizationType).toBe("independent_coordinator");
        expect(completed.organizationName).toBe("Dr. Al-Hashemi Patient Advocacy");
        expect(completed.communicationStyle).toBe("concise_direct");
      } finally {
        cleanup();
      }
    });
  });

  // --- Phase 3B: Human-Like Patient Concierge ---
  describe("Phase 3B: Human-Like Patient Concierge & Communication", () => {
    it("generates empathetic, 1-3 sentence natural coordinator replies with single-question pacing", () => {
      const { store, cleanup } = createTestStore();
      try {
        const config = store.getOrganizationConfig();

        // Test Cardiac patient enquiry
        const res = generateConciergeResponse({
          patientMessage: "My father needs heart bypass surgery in India.",
          config,
        });

        expect(res.emergencyDetected).toBe(false);
        expect(res.activeAgent).toBe("nuvio_concierge");
        // Check sentence count: should be 1-3 sentences
        const sentences = res.reply.split(/[.!?]+/).filter((s) => s.trim().length > 0);
        expect(sentences.length).toBeGreaterThanOrEqual(1);
        expect(sentences.length).toBeLessThanOrEqual(3);
        // Should ask one question
        expect(res.reply.includes("?")).toBe(true);
        expect(res.extractedUpdates?.specialty).toContain("Cardiology");
      } finally {
        cleanup();
      }
    });

    it("triggers emergency redirection for acute life-threatening symptoms", () => {
      const { store, cleanup } = createTestStore();
      try {
        const config = store.getOrganizationConfig();

        const res = generateConciergeResponse({
          patientMessage: "The patient has severe chest pain and difficulty breathing right now",
          config,
        });

        expect(res.emergencyDetected).toBe(true);
        expect(res.reply).toContain("immediate emergency medical care");
        expect(res.reply).toContain("nearest hospital");
      } finally {
        cleanup();
      }
    });

    it("adapts behavior prompt guidance across Hospital, Medical Tourism, and Independent Coordinator", () => {
      const { store, cleanup } = createTestStore();
      try {
        const config = store.getOrganizationConfig();

        // 1. Hospital behavior
        const hospitalGuidance = buildOrganizationBehaviorGuidance("hospital", config);
        expect(hospitalGuidance).toContain("Prioritize");
        expect(hospitalGuidance).toContain("Do NOT recommend or mention competing external hospitals");

        // 2. Medical tourism company behavior
        const mtGuidance = buildOrganizationBehaviorGuidance("medical_tourism_company", config);
        expect(mtGuidance).toContain("Do NOT claim that a hospital has officially accepted a patient");
        expect(mtGuidance).toContain("partner");

        // 3. Independent coordinator behavior
        const indepGuidance = buildOrganizationBehaviorGuidance("independent_coordinator", config);
        expect(indepGuidance).toContain("Do NOT claim or imply that the coordinator owns or directly operates a hospital");

        // Verify full prompt contains the core directives
        const prompt = buildConciergePrompt({ organizationConfig: config });
        expect(prompt).toContain("STRICTLY between 1 to 3 short, natural sentences");
        expect(prompt).toContain("NEVER pretend to be a doctor");
      } finally {
        cleanup();
      }
    });
  });

  // --- Phase 3C: Patient Lead and Follow-up Workflow ---
  describe("Phase 3C: Progressive Lead Intake & Follow-up Subsystem", () => {
    it("progressively ingests lead with consent, relationship, and specialty", () => {
      const { store, cleanup } = createTestStore();
      try {
        const intake = ingestInquiry(store, {
          name: "Rashid Khan",
          country: "Bangladesh",
          phone: "+880 1812 345678",
          email: "rashid.khan@example.com",
          relationship: "family_member",
          specialty: "Oncology",
          complaint: "Seeking second opinion on lung biopsy reports",
          source: "whatsapp",
          stage: "new_enquiry",
          consentGiven: true,
        });

        expect(intake.isDuplicate).toBe(false);
        expect(intake.dossier.stage).toBe("new_enquiry");
        expect(intake.dossier.personal.relationship).toBe("family_member");
        expect(intake.dossier.personal.consent.dataProcessingConsent).toBe(true);
      } finally {
        cleanup();
      }
    });

    it("schedules, manages, and completes follow-ups with an immutable audit trail", () => {
      const { store, cleanup } = createTestStore();
      try {
        const intake = ingestInquiry(store, {
          name: "Fatima Zahra",
          country: "Oman",
          phone: "+968 9555 4444",
          source: "website",
          complaint: "Needs knee replacement surgery",
        });

        const patientId = intake.dossier.patientId;
        const due = Date.now() + 48 * 3600 * 1000;

        // Schedule follow-up
        const afterAdd = store.addFollowUp(patientId, {
          dueDate: due,
          reason: "Call patient to check if X-ray reports have been uploaded",
          nextAction: "WhatsApp follow-up call",
          assignedCoordinator: "nuvio_concierge",
        });

        expect(afterAdd.followUps.length).toBe(1);
        expect(afterAdd.followUps[0]?.status).toBe("scheduled");
        const fuId = afterAdd.followUps[0]!.id;

        // Complete follow-up
        const afterComplete = store.updateFollowUp(patientId, fuId, {
          status: "completed",
          notes: "Patient sent reports via WhatsApp, advancing to clinical review",
        });

        expect(afterComplete.followUps[0]?.status).toBe("completed");
        expect(afterComplete.followUps[0]?.completedAt).toBeDefined();
        // Timeline records both scheduling and completion
        expect(afterComplete.timeline.length).toBeGreaterThanOrEqual(3);
      } finally {
        cleanup();
      }
    });
  });

  // --- Phase 3D: Consultation & Document Coordination ---
  describe("Phase 3D: Consultation & Document Coordination", () => {
    it("manages consultation requests and never displays confirmed without explicit scheduling action", () => {
      const { store, cleanup } = createTestStore();
      try {
        const intake = ingestInquiry(store, {
          name: "Carlos Mendez",
          country: "Spain",
          email: "carlos@example.com",
          source: "website",
        });

        const patientId = intake.dossier.patientId;

        // Request consultation
        const afterRequest = store.requestConsultation(patientId, {
          doctorName: "Dr. K. Sharma",
          department: "Orthopedics",
          mode: "video",
          requestedDate: "2026-12-05",
          preferredTimeSlot: "14:00-16:00 IST",
        });

        expect(afterRequest.consultations.length).toBe(1);
        // Must stay "requested" - never falsely marked confirmed
        expect(afterRequest.consultations[0]?.schedulingStatus).toBe("requested");

        const consultId = afterRequest.consultations[0]!.id;

        // Real confirmation action by coordinator
        const afterConfirm = store.updateConsultation(patientId, consultId, {
          schedulingStatus: "confirmed",
          confirmedDateTime: "2026-12-05T14:30:00+05:30",
          meetingLinkOrLocation: "https://meet.nuvio.hospital/consult-123",
        });

        expect(afterConfirm.consultations[0]?.schedulingStatus).toBe("confirmed");
        expect(afterConfirm.consultations[0]?.confirmedDateTime).toBe("2026-12-05T14:30:00+05:30");
      } finally {
        cleanup();
      }
    });

    it("tracks medical document lifecycle without false medical review claims", () => {
      const { store, cleanup } = createTestStore();
      try {
        const intake = ingestInquiry(store, {
          name: "Elena Rostova",
          country: "Uzbekistan",
          email: "elena@example.com",
          source: "referral",
        });

        const patientId = intake.dossier.patientId;

        // 1. Request document
        const afterReq = store.requestDocument(patientId, {
          name: "Contrast Enhanced MRI Brain",
          category: "imaging_scan",
          notes: "Need axial and sagittal sequences",
        });

        expect(afterReq.documents.length).toBe(1);
        expect(afterReq.documents[0]?.status).toBe("requested");
        expect(afterReq.documents[0]?.isClinicianVerified).toBe(false);

        const docId = afterReq.documents[0]!.id;

        // 2. Mark received
        const afterRec = store.updateDocumentStatus(patientId, docId, {
          status: "received",
          fileRef: "uploads/mri-elena-2026.pdf",
        });
        expect(afterRec.documents[0]?.status).toBe("received");
        expect(afterRec.documents[0]?.isClinicianVerified).toBe(false);

        // 3. Mark clinician verified
        const afterReview = store.updateDocumentStatus(patientId, docId, {
          status: "accepted",
          isClinicianVerified: true,
          reviewedBy: "Dr. Aarti (Clinical Coordinator)",
          notes: "Scans clear, ready for neurosurgery review",
        });

        expect(afterReview.documents[0]?.status).toBe("accepted");
        expect(afterReview.documents[0]?.isClinicianVerified).toBe(true);
      } finally {
        cleanup();
      }
    });
  });

  // --- Phase 3E: Dashboard Metrics ---
  describe("Phase 3E: Real Persisted Operational Dashboard", () => {
    it("computes 100% real aggregated metrics from active patient records", () => {
      const { store, cleanup } = createTestStore();
      try {
        // Patient 1: New enquiry with due follow-up
        const p1 = ingestInquiry(store, {
          name: "Patient One",
          country: "Kenya",
          source: "whatsapp",
          specialty: "Cardiology",
          complaint: "Angiogram done, needs CABG",
        });
        store.addFollowUp(p1.dossier.patientId, {
          dueDate: Date.now() - 3600 * 1000, // Due 1 hour ago
          reason: "Call patient to discuss surgeon availability",
          nextAction: "Phone call",
        });

        // Patient 2: Consultation requested
        const p2 = ingestInquiry(store, {
          name: "Patient Two",
          country: "Nigeria",
          source: "website",
          specialty: "Oncology",
          complaint: "Radiation therapy quote",
        });
        store.requestConsultation(p2.dossier.patientId, {
          department: "Radiation Oncology",
          mode: "video",
        });

        // Patient 3: Pending document
        const p3 = ingestInquiry(store, {
          name: "Patient Three",
          country: "Bangladesh",
          source: "referral",
          specialty: "Orthopedics",
        });
        store.requestDocument(p3.dossier.patientId, {
          name: "Knee X-ray AP/Lateral",
          category: "imaging_scan",
        });

        const metrics = computeDashboardMetrics(store);

        expect(metrics.totalPatients).toBe(3);
        expect(metrics.newEnquiries).toBe(3);
        expect(metrics.activeLeads).toBe(3);
        expect(metrics.followUpsDue).toBe(1);
        expect(metrics.consultationRequests).toBe(1);
        expect(metrics.documentsPending).toBe(1);
        expect(metrics.bySpecialty["Cardiology"]).toBe(1);
        expect(metrics.bySpecialty["Oncology"]).toBe(1);
        expect(metrics.bySpecialty["Orthopedics"]).toBe(1);
      } finally {
        cleanup();
      }
    });
  });
});
