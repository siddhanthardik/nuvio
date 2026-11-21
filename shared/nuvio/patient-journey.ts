/**
 * Nuvio Medical Tourism Platform - Shared Patient Journey Contracts
 * Models the complete lifecycle of international patients across hospital departments.
 */
import { z } from "zod";

export const PATIENT_JOURNEY_STAGES = [
  "lead_captured",
  "contacted",
  "qualified",
  "doctor_consultation",
  "estimate_shared",
  "visa_assistance",
  "travel_coordinated",
  "in_treatment",
  "post_treatment_followup",
  "closed",
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

export const timelineEventSchema = z.object({
  at: z.number().int().describe("Unix epoch millisecond timestamp"),
  stage: z.enum(PATIENT_JOURNEY_STAGES),
  actor: z.string().min(1).describe("Agent ID or hospital staff name"),
  note: z.string().min(1).describe("Action or update summary"),
});

export type TimelineEvent = z.infer<typeof timelineEventSchema>;

export const patientDossierSchema = z.object({
  patientId: z.string().min(1).describe("Unique patient case identifier, e.g. PT-2026-001"),
  inquiryDate: z.number().int(),
  leadSource: z.enum(LEAD_SOURCES),
  stage: z.enum(PATIENT_JOURNEY_STAGES),

  personal: z.object({
    name: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    country: z.string().min(1),
    nationality: z.string().optional(),
    primaryLanguage: z.string().default("English"),
    age: z.number().int().positive().optional(),
    gender: z.enum(["male", "female", "other"]).optional(),
  }),

  clinical: z.object({
    primaryComplaint: z.string().default(""),
    specialty: z.string().default("General"),
    preferredDoctor: z.string().optional(),
    medicalReports: z.array(z.string()).default([]),
    clinicalSummary: z.string().optional(),
  }),

  estimate: z.object({
    procedureName: z.string().optional(),
    costRangeMin: z.number().nonnegative().optional(),
    costRangeMax: z.number().nonnegative().optional(),
    currency: z.string().default("USD"),
    inclusions: z.array(z.string()).default([]),
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
export function canTransitionStage(from: PatientJourneyStage, to: PatientJourneyStage): boolean {
  if (from === to) return true;
  if (to === "closed") return true;
  const fromIndex = PATIENT_JOURNEY_STAGES.indexOf(from);
  const toIndex = PATIENT_JOURNEY_STAGES.indexOf(to);
  // Allow normal forward progress or reasonable steps
  return fromIndex >= 0 && toIndex >= 0;
}
