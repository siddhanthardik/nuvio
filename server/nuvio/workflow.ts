/**
 * Nuvio Medical Tourism Platform - Journey Workflow Orchestration
 * Coordinates multi-agent handoffs, inquiry ingestion, duplicate detection, and review gates.
 */
import type { NuvioHospitalConfig } from "../../shared/nuvio/hospital-config.ts";
import type {
  LeadSource,
  NuvioPatientDossier,
  PatientJourneyStage,
} from "../../shared/nuvio/patient-journey.ts";
import { NuvioDossierStore, stageDefaultAgent } from "./dossier-store.ts";
import { EMERGENCY_RED_FLAGS } from "./prompts.ts";

export interface NewInquiryPayload {
  name: string;
  phone?: string;
  email?: string;
  country: string;
  primaryLanguage?: string;
  complaint?: string;
  source: LeadSource;
  age?: number;
  gender?: "male" | "female" | "other";
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
  const existing = store.findDuplicate(payload.phone, payload.email);
  if (existing) {
    const updated = store.transitionStage(
      existing.patientId,
      existing.stage,
      "nuvio_concierge",
      `Repeated contact received via ${payload.source}. Inquiry note: "${payload.complaint || 'No additional note'}"`
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
    stage: "lead_captured",
    personal: {
      name: payload.name.trim(),
      phone: payload.phone?.trim(),
      email: payload.email?.trim(),
      country: payload.country.trim(),
      primaryLanguage: payload.primaryLanguage || "English",
      age: payload.age,
      gender: payload.gender,
    },
    clinical: {
      primaryComplaint: payload.complaint || "",
      specialty: "General",
      medicalReports: [],
    },
    estimate: {
      currency: "USD",
      inclusions: [],
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
        stage: "lead_captured",
        actor: "nuvio_concierge",
        note: `Inquiry successfully captured from ${payload.source}. Primary complaint: "${payload.complaint || 'None specified'}"`,
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
  config: NuvioHospitalConfig,
  targetStage: PatientJourneyStage
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
Medical Reports Attached: ${dossier.clinical.medicalReports.length}

Estimate Status: ${dossier.estimate.approvedByCoordinator ? "Approved by Coordinator" : "Pending Estimation / Human Sign-off"}
Visa / Logistics Status: ${dossier.visaTravel.visaInvitationIssued ? "Visa Letter Issued" : "Pending Application"}
`;
}
