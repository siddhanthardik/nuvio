/**
 * Nuvio Medical Tourism Platform - Journey Workflow Orchestration
 * Coordinates multi-agent handoffs, inquiry ingestion, progressive lead capture,
 * duplicate detection, and review gates.
 */
import type { NuvioOrganizationConfig } from "../../shared/nuvio/organization-config.ts";
import type {
  LeadSource,
  NuvioPatientDossier,
  PatientRelationship,
} from "../../shared/nuvio/patient-journey.ts";
import { NuvioDossierStore, stageDefaultAgent } from "./dossier-store.ts";
import { EMERGENCY_RED_FLAGS } from "./prompts.ts";

export interface NewInquiryPayload {
  name: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  country: string;
  nationality?: string;
  relationship?: PatientRelationship;
  primaryLanguage?: string;
  specialty?: string;
  complaint?: string;
  briefMedicalSummary?: string;
  preferredDoctor?: string;
  preferredHospital?: string;
  preferredConsultationTiming?: string;
  source: LeadSource;
  age?: number;
  gender?: "male" | "female" | "other";
  consentGiven?: boolean;
  stage?: string;
}

export interface IngestionResult {
  isDuplicate: boolean;
  dossier: NuvioPatientDossier;
  emergencyWarning: boolean;
  message: string;
}

export function detectEmergency(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return EMERGENCY_RED_FLAGS.some((flag) => lower.includes(flag));
}

export function generatePatientId(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  const timeSuffix = Date.now().toString(36).slice(-3).toUpperCase();
  return `PT-${year}-${rand}${timeSuffix}`;
}

export function ingestInquiry(
  store: NuvioDossierStore,
  payload: NewInquiryPayload
): IngestionResult {
  const isEmergency = detectEmergency(payload.complaint || "");

  // 1. Check for existing duplicate lead
  const existing = store.findDuplicate(payload.phone || payload.whatsapp, payload.email);
  if (existing) {
    const updated = store.transitionStage(
      existing.patientId,
      existing.stage,
      "nuvio_concierge",
      `Repeated contact received via ${payload.source}. Inquiry note: "${payload.complaint || 'Follow-up enquiry'}"`
    );

    return {
      isDuplicate: true,
      dossier: updated,
      emergencyWarning: isEmergency,
      message: `Existing patient record identified (${existing.patientId}). Appended contact record.`,
    };
  }

  // 2. Create new patient dossier
  const patientId = generatePatientId();
  const initialDossier: NuvioPatientDossier = {
    patientId,
    inquiryDate: Date.now(),
    leadSource: payload.source,
    stage: payload.stage || "lead_captured",
    personal: {
      name: payload.name.trim(),
      phone: payload.phone?.trim(),
      email: payload.email?.trim(),
      whatsapp: payload.whatsapp?.trim(),
      country: payload.country.trim(),
      nationality: payload.nationality?.trim(),
      relationship: payload.relationship || "patient",
      primaryLanguage: payload.primaryLanguage || "English",
      age: payload.age,
      gender: payload.gender,
      consent: {
        dataProcessingConsent: payload.consentGiven !== false,
        consentTimestamp: Date.now(),
        consentChannel: payload.source,
      },
    },
    clinical: {
      primaryComplaint: payload.complaint || "",
      specialty: payload.specialty || "General",
      briefMedicalSummary: payload.briefMedicalSummary,
      preferredDoctor: payload.preferredDoctor,
      preferredHospital: payload.preferredHospital,
      preferredConsultationTiming: payload.preferredConsultationTiming,
      medicalReports: [],
    },
    documents: [],
    consultations: [],
    followUps: [],
    estimate: {
      currency: "USD",
      inclusions: [],
      exclusions: [],
      approvedByCoordinator: false,
    },
    visaTravel: {
      visaInvitationIssued: false,
      airportPickupRequired: false,
      hotelAccommodationNeeded: false,
    },
    timeline: [
      {
        at: Date.now(),
        stage: payload.stage || "lead_captured",
        actor: "nuvio_concierge",
        note: `Enquiry successfully captured from ${payload.source}. Specialty: ${payload.specialty || 'General'}`,
      },
    ],
    activeAgent: "nuvio_concierge",
    pendingHumanReview: {
      needed: isEmergency,
      reason: isEmergency ? "Potential emergency keywords detected in patient inquiry." : undefined,
    },
  };

  const saved = store.saveDossier(initialDossier);

  return {
    isDuplicate: false,
    dossier: saved,
    emergencyWarning: isEmergency,
    message: `New patient record created with ID ${patientId}.`,
  };
}

export function buildHandoffSummary(
  dossier: NuvioPatientDossier,
  config: NuvioOrganizationConfig,
  targetStage: string
): string {
  const targetAgentId = stageDefaultAgent(targetStage);
  const targetAgentRole = (config.agents as Record<string, { displayName: string; title: string }>)[targetAgentId];
  const targetAgentName = targetAgentRole ? `${targetAgentRole.displayName} (${targetAgentRole.title})` : targetAgentId;

  return `
[PATIENT DOSSIER HANDOFF SUMMARY]
Patient ID: ${dossier.patientId}
Name: ${dossier.personal.name}
Country: ${dossier.personal.country} (Language: ${dossier.personal.primaryLanguage})
Inquiry Date: ${new Date(dossier.inquiryDate).toISOString()}
Current Stage: ${dossier.stage} -> Transitioning To: ${targetStage}
Receiving Agent: ${targetAgentName}

Clinical Complaint: ${dossier.clinical.primaryComplaint || "None provided yet"}
Specialty Assigned: ${dossier.clinical.specialty}
Documents Attached: ${dossier.documents.length}
Consultations Logged: ${dossier.consultations.length}
Follow-ups Pending: ${dossier.followUps.filter((f) => f.status === "scheduled").length}

Estimate Status: ${dossier.estimate.approvedByCoordinator ? "Approved by Coordinator" : "Pending Estimation / Human Sign-off"}
Visa / Logistics Status: ${dossier.visaTravel.visaInvitationIssued ? "Visa Letter Issued" : "Pending Application"}
`;
}
