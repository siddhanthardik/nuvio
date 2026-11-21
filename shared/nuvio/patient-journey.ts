/**
 * Nuvio Medical Tourism Platform - Shared Patient Journey Contracts
 * Models the full 16-stage lifecycle, follow-ups, consultations, and document coordination.
 */
import { z } from "zod";

export const PRIMARY_JOURNEY_STAGES = [
  "new_enquiry",
  "initial_conversation",
  "patient_qualification",
  "treatment_interest_identified",
  "required_info_requested",
  "documents_pending",
  "ready_for_clinical_review",
  "consultation_requested",
  "consultation_scheduled",
  "consultation_completed",
  "treatment_estimate_pending",
  "estimate_shared",
  "patient_decision_pending",
  "converted_treatment_proceeding",
  "lost_inactive",
  "closed",
] as const;

/** Extended stages including legacy Phase 2 aliases */
export const PATIENT_JOURNEY_STAGES = [
  ...PRIMARY_JOURNEY_STAGES,
  "lead_captured",
  "contacted",
  "qualified",
  "doctor_consultation",
  "visa_assistance",
  "travel_coordinated",
  "in_treatment",
  "post_treatment_followup",
] as const;

export type PatientJourneyStage = (typeof PATIENT_JOURNEY_STAGES)[number];

export const LEAD_SOURCES = [
  "whatsapp",
  "website",
  "meta_ads",
  "google_ads",
  "email",
  "referral",
  "phone",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export const PATIENT_RELATIONSHIPS = [
  "patient",
  "family_member",
  "attendant",
  "other",
] as const;

export type PatientRelationship = (typeof PATIENT_RELATIONSHIPS)[number];

export const timelineEventSchema = z.object({
  at: z.number().int().describe("Unix epoch millisecond timestamp"),
  stage: z.string().describe("Journey stage milestone"),
  actor: z.string().min(1).describe("Agent ID or hospital staff name"),
  note: z.string().min(1).describe("Action or update summary"),
  eventType: z.string().optional().describe("Specific case event type"),
  requiresHumanApproval: z.boolean().optional(),
  approved: z.boolean().optional(),
});

export type TimelineEvent = z.infer<typeof timelineEventSchema>;

export const FOLLOW_UP_STATUSES = ["scheduled", "completed", "cancelled", "overdue"] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export const followUpSchema = z.object({
  id: z.string().min(1),
  dueDate: z.number().int().describe("Unix timestamp when follow-up is due"),
  reason: z.string().min(1).describe("Reason for follow-up (e.g. check on reports, share estimate)"),
  lastInteraction: z.number().int().optional(),
  nextAction: z.string().min(1).describe("Specific planned action"),
  assignedCoordinator: z.string().default("nuvio_concierge"),
  status: z.enum(FOLLOW_UP_STATUSES).default("scheduled"),
  createdAt: z.number().int(),
  completedAt: z.number().int().optional(),
  notes: z.string().optional(),
});

export type FollowUp = z.infer<typeof followUpSchema>;

export const CONSULTATION_MODES = ["video", "in_person", "telephonic"] as const;
export type ConsultationMode = (typeof CONSULTATION_MODES)[number];

export const CONSULTATION_SCHEDULING_STATUSES = [
  "requested",
  "coordinator_review",
  "confirmed",
  "completed",
  "cancelled",
] as const;

export type ConsultationSchedulingStatus = (typeof CONSULTATION_SCHEDULING_STATUSES)[number];

export const consultationSchema = z.object({
  id: z.string().min(1),
  requestedDate: z.string().optional(),
  preferredTimeSlot: z.string().optional(),
  doctorName: z.string().optional(),
  department: z.string().optional(),
  hospitalName: z.string().optional(),
  mode: z.enum(CONSULTATION_MODES).default("video"),
  schedulingStatus: z.enum(CONSULTATION_SCHEDULING_STATUSES).default("requested"),
  confirmedDateTime: z.string().optional(),
  meetingLinkOrLocation: z.string().optional(),
  coordinatorNotes: z.string().optional(),
  createdAt: z.number().int(),
});

export type Consultation = z.infer<typeof consultationSchema>;

export const DOCUMENT_CATEGORIES = [
  "medical_report",
  "blood_test",
  "imaging_scan",
  "discharge_summary",
  "prescription",
  "passport_copy",
  "other",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_STATUSES = [
  "requested",
  "received",
  "under_review",
  "accepted",
  "additional_info_required",
] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const patientDocumentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(DOCUMENT_CATEGORIES).default("medical_report"),
  status: z.enum(DOCUMENT_STATUSES).default("requested"),
  requestedAt: z.number().int(),
  receivedAt: z.number().int().optional(),
  reviewedAt: z.number().int().optional(),
  reviewedBy: z.string().optional(),
  isClinicianVerified: z.boolean().default(false),
  fileRef: z.string().optional(),
  notes: z.string().optional(),
});

export type PatientDocument = z.infer<typeof patientDocumentSchema>;

export const patientDossierSchema = z.object({
  patientId: z.string().min(1).describe("Unique patient case identifier, e.g. PT-2026-001"),
  inquiryDate: z.number().int(),
  leadSource: z.enum(LEAD_SOURCES),
  stage: z.string().describe("Current patient journey stage"),

  personal: z.object({
    name: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    whatsapp: z.string().optional(),
    country: z.string().min(1),
    nationality: z.string().optional(),
    relationship: z.enum(PATIENT_RELATIONSHIPS).default("patient"),
    primaryLanguage: z.string().default("English"),
    age: z.number().int().positive().optional(),
    gender: z.enum(["male", "female", "other"]).optional(),
    consent: z
      .object({
        dataProcessingConsent: z.boolean().default(true),
        consentTimestamp: z.number().int().optional(),
        consentChannel: z.string().default("inquiry_form"),
      })
      .default({ dataProcessingConsent: true, consentChannel: "inquiry_form" }),
  }),

  clinical: z.object({
    primaryComplaint: z.string().default(""),
    specialty: z.string().default("General"),
    briefMedicalSummary: z.string().optional(),
    preferredDoctor: z.string().optional(),
    preferredHospital: z.string().optional(),
    preferredConsultationTiming: z.string().optional(),
    medicalReports: z.array(z.string()).default([]),
    clinicalSummary: z.string().optional(),
  }),

  // Structured Documents coordination (Phase 3D)
  documents: z.array(patientDocumentSchema).default([]),

  // Structured Consultations coordination (Phase 3D)
  consultations: z.array(consultationSchema).default([]),

  // Scheduled Follow-ups (Phase 3C)
  followUps: z.array(followUpSchema).default([]),

  estimate: z.object({
    procedureName: z.string().optional(),
    costRangeMin: z.number().nonnegative().optional(),
    costRangeMax: z.number().nonnegative().optional(),
    currency: z.string().default("USD"),
    inclusions: z.array(z.string()).default([]),
    exclusions: z.array(z.string()).default([]),
    approvedByCoordinator: z.boolean().default(false),
    approvedAt: z.number().optional(),
    approvedBy: z.string().optional(),
  }),

  visaTravel: z.object({
    passportNumber: z.string().optional(),
    attendantPassport: z.string().optional(),
    visaInvitationIssued: z.boolean().default(false),
    visaLetterRef: z.string().optional(),
    arrivalDate: z.string().optional(),
    flightNumber: z.string().optional(),
    airportPickupRequired: z.boolean().default(false),
    hotelAccommodationNeeded: z.boolean().default(false),
  }),

  timeline: z.array(timelineEventSchema).default([]),
  activeAgent: z.string().default("nuvio_concierge"),

  pendingHumanReview: z.object({
    needed: z.boolean().default(false),
    reason: z.string().optional(),
  }).default({ needed: false }),
});

export type NuvioPatientDossier = z.infer<typeof patientDossierSchema>;
export type PatientDossierInput = z.input<typeof patientDossierSchema>;

/** Validates whether a patient journey stage transition is permitted */
export function canTransitionStage(from: string, to: string): boolean {
  if (from === to) return true;
  if (to === "closed" || to === "lost_inactive") return true;
  return true;
}
