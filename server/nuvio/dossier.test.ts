import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { NuvioDossierStore } from "./dossier-store.ts";
import { detectEmergency, ingestInquiry } from "./workflow.ts";
import { canTransitionStage } from "../../shared/nuvio/patient-journey.ts";

function createTestStore(): { store: NuvioDossierStore; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "nuvio-test-"));
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

describe("Nuvio Patient Journey & Hospital Store", () => {
  it("initializes default hospital configuration with Siddhant, Dr. Aarti, Pramesh, and Mahesh", () => {
    const { store, cleanup } = createTestStore();
    try {
      const config = store.getHospitalConfig();
      expect(config.hospitalId).toBe("hospital_default");
      expect(config.agents.nuvio_concierge.displayName).toBe("Siddhant");
      expect(config.agents.nuvio_clinical.displayName).toBe("Dr. Aarti");
      expect(config.agents.nuvio_estimator.displayName).toBe("Pramesh");
      expect(config.agents.nuvio_travel.displayName).toBe("Mahesh");
      expect(config.safetyGuards.requireHumanApprovalForEstimates).toBe(true);
      expect(config.safetyGuards.requireHumanApprovalForVisaLetters).toBe(true);
    } finally {
      cleanup();
    }
  });

  it("updates hospital profile with customized branding and currency", () => {
    const { store, cleanup } = createTestStore();
    try {
      const updated = store.saveHospitalConfig({
        hospitalId: "hosp_metro_delhi",
        hospitalName: "Metro Heart & Cancer Institute",
        tagline: "World-Class Care in New Delhi",
        accreditations: ["JCI", "NABH"],
        defaultCurrency: "USD",
        contactEmail: "international@metrohospital.example.com",
        supportedSpecialties: ["Cardiology", "Oncology"],
        agents: {
          nuvio_concierge: {
            id: "nuvio_concierge",
            displayName: "Kabir",
            title: "Senior Patient Coordinator",
            enabled: true,
            customInstructions: "Welcome patients warmly in Hindi, Bengali, or English.",
          },
          nuvio_clinical: {
            id: "nuvio_clinical",
            displayName: "Dr. Aarti",
            title: "Lead Clinical Coordinator",
            enabled: true,
            customInstructions: "Summarize previous surgeries and cardiac reports.",
          },
          nuvio_estimator: {
            id: "nuvio_estimator",
            displayName: "Pramesh",
            title: "Package Estimator",
            enabled: true,
            customInstructions: "Provide CABG and Angioplasty package ranges.",
          },
          nuvio_travel: {
            id: "nuvio_travel",
            displayName: "Mahesh",
            title: "Visa Specialist",
            enabled: true,
            customInstructions: "Assist with Delhi FRRO and medical visa invites.",
          },
        },
      });

      expect(updated.hospitalName).toBe("Metro Heart & Cancer Institute");
      expect(updated.agents.nuvio_concierge.displayName).toBe("Kabir");

      // Verify persistence across reload
      const loaded = store.getHospitalConfig();
      expect(loaded.hospitalName).toBe("Metro Heart & Cancer Institute");
      expect(loaded.agents.nuvio_concierge.displayName).toBe("Kabir");
    } finally {
      cleanup();
    }
  });

  it("ingests a new international patient inquiry and creates a persistent dossier", () => {
    const { store, cleanup } = createTestStore();
    try {
      const result = ingestInquiry(store, {
        name: "Tariqul Islam",
        country: "Bangladesh",
        phone: "+880 1711 000111",
        email: "tariqul@example.com",
        complaint: "Seeking second opinion for coronary artery bypass surgery",
        source: "whatsapp",
        primaryLanguage: "Bengali",
      });

      expect(result.isDuplicate).toBe(false);
      expect(result.emergencyWarning).toBe(false);
      expect(result.dossier.personal.name).toBe("Tariqul Islam");
      expect(result.dossier.stage).toBe("lead_captured");
      expect(result.dossier.activeAgent).toBe("nuvio_concierge");
      expect(result.dossier.timeline.length).toBe(1);

      // Verify retrieval by patientId
      const fetched = store.getDossier(result.dossier.patientId);
      expect(fetched).not.toBeNull();
      expect(fetched?.personal.country).toBe("Bangladesh");
    } finally {
      cleanup();
    }
  });

  it("detects duplicate patient leads by phone or email", () => {
    const { store, cleanup } = createTestStore();
    try {
      // First lead from website
      const first = ingestInquiry(store, {
        name: "Amina Al-Mansoor",
        country: "Oman",
        phone: "+968 9123 4567",
        email: "amina.mansoor@example.com",
        complaint: "Need consultation for knee replacement",
        source: "website",
      });
      expect(first.isDuplicate).toBe(false);

      // Second contact via WhatsApp with same phone formatted differently
      const duplicate = ingestInquiry(store, {
        name: "Amina Al-Mansoor",
        country: "Oman",
        phone: "+96891234567",
        complaint: "Following up about my earlier message",
        source: "whatsapp",
      });

      expect(duplicate.isDuplicate).toBe(true);
      expect(duplicate.dossier.patientId).toBe(first.dossier.patientId);
      // Timeline now has 2 events (creation + follow-up)
      expect(duplicate.dossier.timeline.length).toBe(2);
    } finally {
      cleanup();
    }
  });

  it("advances patient journey stage and updates active specialist agent", () => {
    const { store, cleanup } = createTestStore();
    try {
      const intake = ingestInquiry(store, {
        name: "Farhan Siddiqui",
        country: "UAE",
        email: "farhan@example.com",
        complaint: "Spine surgery consultation",
        source: "meta_ads",
      });

      const patientId = intake.dossier.patientId;

      // 1. Advance to doctor consultation -> agent switches to Dr. Aarti (nuvio_clinical)
      const afterConsult = store.transitionStage(
        patientId,
        "doctor_consultation",
        "Siddhant",
        "Shared MRI reports with clinical coordination team"
      );
      expect(afterConsult.stage).toBe("doctor_consultation");
      expect(afterConsult.activeAgent).toBe("nuvio_clinical");

      // 2. Advance to estimate -> agent switches to Pramesh (nuvio_estimator)
      const afterEstimate = store.transitionStage(
        patientId,
        "estimate_shared",
        "Dr. Aarti",
        "Dr. Sharma recommended minimally invasive discectomy. Ready for package pricing."
      );
      expect(afterEstimate.stage).toBe("estimate_shared");
      expect(afterEstimate.activeAgent).toBe("nuvio_estimator");

      // 3. Advance to visa assistance -> agent switches to Mahesh (nuvio_travel)
      const afterVisa = store.transitionStage(
        patientId,
        "visa_assistance",
        "Pramesh",
        "Patient accepted package range. Preparing medical visa letter."
      );
      expect(afterVisa.stage).toBe("visa_assistance");
      expect(afterVisa.activeAgent).toBe("nuvio_travel");
      expect(afterVisa.timeline.length).toBe(4);
    } finally {
      cleanup();
    }
  });

  it("detects emergency red flags and requires human safety review", () => {
    expect(detectEmergency("I have sudden chest pain and difficulty breathing")).toBe(true);
    expect(detectEmergency("Looking for dental implants quote next month")).toBe(false);

    const { store, cleanup } = createTestStore();
    try {
      const emergencyIntake = ingestInquiry(store, {
        name: "Emergency Patient",
        country: "Kenya",
        phone: "+254 700 123456",
        complaint: "Patient collapsed with severe chest pain earlier today",
        source: "whatsapp",
      });

      expect(emergencyIntake.emergencyWarning).toBe(true);
      expect(emergencyIntake.dossier.pendingHumanReview.needed).toBe(true);
      expect(emergencyIntake.dossier.pendingHumanReview.reason).toContain("emergency");
    } finally {
      cleanup();
    }
  });

  it("validates stage transition feasibility rules", () => {
    expect(canTransitionStage("lead_captured", "qualified")).toBe(true);
    expect(canTransitionStage("qualified", "doctor_consultation")).toBe(true);
    expect(canTransitionStage("doctor_consultation", "closed")).toBe(true);
  });
});
