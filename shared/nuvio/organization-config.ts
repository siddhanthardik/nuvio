/**
 * Nuvio Medical Tourism Platform - Organization Profile and Workforce Configuration Schema
 * Supports 3 organization types:
 * 1. Hospital / Healthcare Provider
 * 2. Medical Tourism Company
 * 3. Independent Medical Coordinator
 *
 * Stored locally on each organization's dedicated VPS instance for complete data sovereignty.
 */
import { z } from "zod";

export const ORGANIZATION_TYPES = [
  "hospital",
  "medical_tourism_company",
  "independent_coordinator",
] as const;

export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export const COMMUNICATION_STYLES = [
  "warm_professional",
  "concise_direct",
  "clinical_formal",
] as const;

export type CommunicationStyle = (typeof COMMUNICATION_STYLES)[number];

export const WORKFLOW_CAPABILITIES = [
  "lead_qualification",
  "document_collection",
  "consultation_coordination",
  "estimate_coordination",
  "visa_travel_coordination",
  "post_treatment_followup",
] as const;

export type WorkflowCapability = (typeof WORKFLOW_CAPABILITIES)[number];

export const NUVIO_AGENT_IDS = [
  "nuvio_concierge",
  "nuvio_lead_qualifier",
  "nuvio_journey_coordinator",
  "nuvio_clinical",
  "nuvio_consultation",
  "nuvio_estimator",
  "nuvio_travel",
  "nuvio_followup",
  "nuvio_voice",
] as const;

export type NuvioAgentId = (typeof NUVIO_AGENT_IDS)[number];

export const nuvioAgentRoleSchema = z.object({
  id: z.enum(NUVIO_AGENT_IDS),
  displayName: z.string().min(1),
  title: z.string().min(1),
  avatarUrl: z.string().optional(),
  enabled: z.boolean().default(true),
  customInstructions: z.string().default(""),
});

export type NuvioAgentRole = z.infer<typeof nuvioAgentRoleSchema>;

export const DEFAULT_AGENTS = {
  nuvio_concierge: {
    id: "nuvio_concierge" as const,
    displayName: "Siddhant",
    title: "Patient Concierge",
    enabled: true,
    customInstructions: "Provide warm, natural, empathetic 1-3 sentence guidance. Ask one question at a time.",
  },
  nuvio_lead_qualifier: {
    id: "nuvio_lead_qualifier" as const,
    displayName: "Kavita",
    title: "Lead Qualification Agent",
    enabled: true,
    customInstructions: "Score urgency, evaluate patient intent, verify destination preferences and budget fit.",
  },
  nuvio_journey_coordinator: {
    id: "nuvio_journey_coordinator" as const,
    displayName: "Rohan",
    title: "Patient Journey Coordinator",
    enabled: true,
    customInstructions: "Track patient stage progression, identify journey blockers, and dispatch specialist tasks.",
  },
  nuvio_clinical: {
    id: "nuvio_clinical" as const,
    displayName: "Dr. Aarti",
    title: "Medical Records Coordinator",
    enabled: true,
    customInstructions: "Coordinate medical reports and summarize clinical history. Never diagnose directly.",
  },
  nuvio_consultation: {
    id: "nuvio_consultation" as const,
    displayName: "Ananya",
    title: "Consultation Coordinator",
    enabled: true,
    customInstructions: "Coordinate doctor availability, organize teleconsultations, and verify patient questions.",
  },
  nuvio_estimator: {
    id: "nuvio_estimator" as const,
    displayName: "Pramesh",
    title: "Treatment Estimate Agent",
    enabled: true,
    customInstructions: "Formulate realistic multi-currency estimate ranges. Require human approval before sharing final quotes.",
  },
  nuvio_travel: {
    id: "nuvio_travel" as const,
    displayName: "Mahesh",
    title: "Medical Visa & Travel Specialist",
    enabled: true,
    customInstructions: "Coordinate medical visa paperwork, flight itinerary, airport pickup, and companion lodging.",
  },
  nuvio_followup: {
    id: "nuvio_followup" as const,
    displayName: "Pooja",
    title: "Patient Follow-up Agent",
    enabled: true,
    customInstructions: "Run personalized check-in cadences, re-engage dormant enquiries, and track recovery milestones.",
  },
  nuvio_voice: {
    id: "nuvio_voice" as const,
    displayName: "Vikram",
    title: "Voice Calling Agent",
    enabled: true,
    customInstructions: "Handle inbound and outbound patient phone calls, clarify urgent requests, and log call summaries.",
  },
};

export const partnerHospitalSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  city: z.string().default(""),
  country: z.string().default(""),
  accreditations: z.array(z.string()).default([]),
  specialties: z.array(z.string()).default([]),
  isPreferred: z.boolean().default(false),
});

export type PartnerHospital = z.infer<typeof partnerHospitalSchema>;

export const organizationConfigSchema = z.preprocess(
  (val: unknown) => {
    if (typeof val === "object" && val !== null) {
      const obj = { ...(val as Record<string, unknown>) };
      if (obj.hospitalName && !obj.organizationName) obj.organizationName = obj.hospitalName;
      if (obj.organizationName && !obj.hospitalName) obj.hospitalName = obj.organizationName;
      if (obj.hospitalId && !obj.organizationId) obj.organizationId = obj.hospitalId;
      if (obj.organizationId && !obj.hospitalId) obj.hospitalId = obj.organizationId;
      if (obj.agents && typeof obj.agents === "object") {
        obj.agents = { ...DEFAULT_AGENTS, ...(obj.agents as Record<string, unknown>) };
      }
      return obj;
    }
    return val;
  },
  z.object({
    organizationId: z.string().min(1).default("hospital_default"),
    hospitalId: z.string().min(1).default("hospital_default"),
    organizationType: z.enum(ORGANIZATION_TYPES).default("hospital"),
    organizationName: z.string().min(1).default("Nuvio Partner Hospital"),
    hospitalName: z.string().min(1).default("Nuvio Partner Hospital"),
    tagline: z.string().default("Excellence in Patient Coordination & Care"),
    country: z.string().min(1).default("India"),
    operatingLocation: z.string().default("New Delhi"),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().optional(),
    contactWhatsApp: z.string().optional(),
    emergencyContact: z.string().optional(),
    timezone: z.string().default("Asia/Kolkata"),
    defaultCurrency: z.string().default("USD"),
    supportedLanguages: z.array(z.string()).default(["English", "Bengali", "Arabic", "Russian"]),
    communicationStyle: z.enum(COMMUNICATION_STYLES).default("warm_professional"),
    onboardingCompleted: z.boolean().default(false),

    // Accreditation & specialties
    accreditations: z.array(z.string()).default(["JCI", "NABH"]),
    supportedSpecialties: z.array(z.string()).default([
      "Cardiology & Cardiac Surgery",
      "Oncology & Bone Marrow Transplant",
      "Orthopedics & Joint Replacement",
      "Neurology & Neurosurgery",
      "Organ Transplant",
      "IVF & Fertility",
    ]),

    // Partner hospitals for medical tourism companies and independent coordinators
    partnerHospitals: z.array(partnerHospitalSchema).default([]),

    // Enabled workflow capabilities
    enabledCapabilities: z.array(z.enum(WORKFLOW_CAPABILITIES)).default([
      "lead_qualification",
      "document_collection",
      "consultation_coordination",
      "estimate_coordination",
      "visa_travel_coordination",
      "post_treatment_followup",
    ]),

    // Agents configuration
    agents: z
      .object({
        nuvio_concierge: nuvioAgentRoleSchema.default(DEFAULT_AGENTS.nuvio_concierge),
        nuvio_lead_qualifier: nuvioAgentRoleSchema.optional().default(DEFAULT_AGENTS.nuvio_lead_qualifier),
        nuvio_journey_coordinator: nuvioAgentRoleSchema.optional().default(DEFAULT_AGENTS.nuvio_journey_coordinator),
        nuvio_clinical: nuvioAgentRoleSchema.default(DEFAULT_AGENTS.nuvio_clinical),
        nuvio_consultation: nuvioAgentRoleSchema.optional().default(DEFAULT_AGENTS.nuvio_consultation),
        nuvio_estimator: nuvioAgentRoleSchema.default(DEFAULT_AGENTS.nuvio_estimator),
        nuvio_travel: nuvioAgentRoleSchema.default(DEFAULT_AGENTS.nuvio_travel),
        nuvio_followup: nuvioAgentRoleSchema.optional().default(DEFAULT_AGENTS.nuvio_followup),
        nuvio_voice: nuvioAgentRoleSchema.optional().default(DEFAULT_AGENTS.nuvio_voice),
      })
      .default(DEFAULT_AGENTS),

    // Safety & clinical boundary guards
    safetyGuards: z
      .object({
        requireHumanApprovalForEstimates: z.boolean().default(true),
        requireHumanApprovalForVisaLetters: z.boolean().default(true),
        enforceNonDiagnosticDisclaimer: z.boolean().default(true),
        maxSentencesPerMessage: z.number().int().min(1).max(5).default(3),
        disclaimerText: z
          .string()
          .default(
            "Notice: Preliminary guidance provided by Nuvio AI is for information and logistics coordination only and does not constitute a clinical diagnosis or treatment prescription. Formal clinical evaluation occurs directly with licensed physicians."
          ),
      })
      .default({
        requireHumanApprovalForEstimates: true,
        requireHumanApprovalForVisaLetters: true,
        enforceNonDiagnosticDisclaimer: true,
        maxSentencesPerMessage: 3,
        disclaimerText:
          "Notice: Preliminary guidance provided by Nuvio AI is for information and logistics coordination only and does not constitute a clinical diagnosis or treatment prescription. Formal clinical evaluation occurs directly with licensed physicians.",
      }),
  })
);

export type NuvioOrganizationConfig = z.infer<typeof organizationConfigSchema>;
export type NuvioOrganizationConfigInput = Omit<Partial<NuvioOrganizationConfig>, "agents"> & {
  agents?: Partial<NuvioOrganizationConfig["agents"]>;
};

export const DEFAULT_ORGANIZATION_CONFIG: NuvioOrganizationConfig = organizationConfigSchema.parse({});

/**
 * Backward compatibility alias for Phase 2 code.
 */
export const hospitalConfigSchema = organizationConfigSchema;
export type NuvioHospitalConfig = NuvioOrganizationConfig;
export type NuvioHospitalConfigInput = NuvioOrganizationConfigInput;
export const DEFAULT_HOSPITAL_CONFIG = DEFAULT_ORGANIZATION_CONFIG;
