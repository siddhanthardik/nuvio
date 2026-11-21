/**
 * Nuvio Medical Tourism Platform - Hospital Profile and Agent Configuration Schema
 * Stored locally on each hospital's dedicated VPS instance for complete data sovereignty.
 */
import { z } from "zod";

export const nuvioAgentRoleSchema = z.object({
  id: z.enum(["nuvio_concierge", "nuvio_clinical", "nuvio_estimator", "nuvio_travel"]),
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
    title: "Patient Concierge & Lead Coordinator",
    enabled: true,
    customInstructions: "Provide warm, responsive multilingual patient intake and qualification.",
  },
  nuvio_clinical: {
    id: "nuvio_clinical" as const,
    displayName: "Dr. Aarti",
    title: "Clinical Coordinator",
    enabled: true,
    customInstructions: "Organize medical reports and formulate clinical case summaries. Do not make direct diagnoses.",
  },
  nuvio_estimator: {
    id: "nuvio_estimator" as const,
    displayName: "Pramesh",
    title: "Treatment Package & Cost Estimator",
    enabled: true,
    customInstructions: "Provide structured, multi-currency cost ranges. Require human approval before sharing final quotes.",
  },
  nuvio_travel: {
    id: "nuvio_travel" as const,
    displayName: "Mahesh",
    title: "Medical Visa & Travel Logistics Specialist",
    enabled: true,
    customInstructions: "Coordinate medical visa paperwork, flight itinerary, airport pickup, and hospital guest accommodations.",
  },
};

export const hospitalConfigSchema = z.object({
  hospitalId: z.string().min(1).default("hospital_default"),
  hospitalName: z.string().min(1).default("Nuvio Partner Hospital"),
  tagline: z.string().default("Excellence in International Healthcare"),
  accreditations: z.array(z.string()).default(["JCI", "NABH"]),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  contactWhatsApp: z.string().optional(),
  defaultCurrency: z.string().default("USD"),
  supportedSpecialties: z.array(z.string()).default([
    "Cardiology & Cardiac Surgery",
    "Oncology & Bone Marrow Transplant",
    "Orthopedics & Joint Replacement",
    "Neurology & Neurosurgery",
    "Organ Transplant",
    "IVF & Fertility",
  ]),
  agents: z
    .object({
      nuvio_concierge: nuvioAgentRoleSchema.default(DEFAULT_AGENTS.nuvio_concierge),
      nuvio_clinical: nuvioAgentRoleSchema.default(DEFAULT_AGENTS.nuvio_clinical),
      nuvio_estimator: nuvioAgentRoleSchema.default(DEFAULT_AGENTS.nuvio_estimator),
      nuvio_travel: nuvioAgentRoleSchema.default(DEFAULT_AGENTS.nuvio_travel),
    })
    .default(DEFAULT_AGENTS),
  safetyGuards: z
    .object({
      requireHumanApprovalForEstimates: z.boolean().default(true),
      requireHumanApprovalForVisaLetters: z.boolean().default(true),
      enforceNonDiagnosticDisclaimer: z.boolean().default(true),
      disclaimerText: z
        .string()
        .default(
          "Notice: Preliminary guidance provided by Nuvio AI is for information and logistics coordination only and does not constitute a clinical diagnosis or treatment prescription. Formal clinical evaluation occurs directly with hospital physicians."
        ),
    })
    .default({
      requireHumanApprovalForEstimates: true,
      requireHumanApprovalForVisaLetters: true,
      enforceNonDiagnosticDisclaimer: true,
      disclaimerText:
        "Notice: Preliminary guidance provided by Nuvio AI is for information and logistics coordination only and does not constitute a clinical diagnosis or treatment prescription. Formal clinical evaluation occurs directly with hospital physicians.",
    }),
});

export type NuvioHospitalConfig = z.infer<typeof hospitalConfigSchema>;
export type NuvioHospitalConfigInput = z.input<typeof hospitalConfigSchema>;

export const DEFAULT_HOSPITAL_CONFIG: NuvioHospitalConfig = hospitalConfigSchema.parse({});
