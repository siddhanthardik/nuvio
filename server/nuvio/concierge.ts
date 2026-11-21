/**
 * Nuvio Medical Tourism Platform - Human-Like Patient Concierge Engine
 * Formulates empathetic, concise (1-3 sentence) coordinator responses, enforces
 * single-question pacing, handles emergency red-flags, and extracts progressive patient info.
 */
import type { NuvioOrganizationConfig } from "../../shared/nuvio/organization-config.ts";
import type { NuvioPatientDossier } from "../../shared/nuvio/patient-journey.ts";
import { detectEmergency } from "./workflow.ts";

export interface ConciergeInteractionInput {
  patientMessage: string;
  config: NuvioOrganizationConfig;
  dossier?: NuvioPatientDossier | null;
  history?: Array<{ sender: "patient" | "coordinator"; text: string }>;
}

export interface ConciergeInteractionOutput {
  reply: string;
  emergencyDetected: boolean;
  activeAgent: string;
  extractedUpdates?: {
    name?: string;
    country?: string;
    specialty?: string;
    complaint?: string;
  };
  suggestedNextStage?: string;
}

export function generateConciergeResponse(input: ConciergeInteractionInput): ConciergeInteractionOutput {
  const { patientMessage, config, dossier } = input;
  const isEmergency = detectEmergency(patientMessage);

  // 1. Emergency safety gate
  if (isEmergency) {
    const orgName = config.organizationName;
    return {
      reply: `Please seek immediate emergency medical care at the nearest hospital in your area. Your safety is our primary concern, and our team at ${orgName} will follow up with you once you are in stable medical care.`,
      emergencyDetected: true,
      activeAgent: "nuvio_concierge",
    };
  }

  const agentName = config.agents.nuvio_concierge.displayName;
  const orgName = config.organizationName;
  const lowerMsg = patientMessage.toLowerCase();

  // 2. Identify conversational intent
  // Greeting
  const isGreeting = /^(hi|hello|hey|salam|namaste|good\s*(morning|afternoon|evening))/i.test(patientMessage.trim());

  // Cardiac / Heart
  const isCardiac = /heart|cardiac|bypass|cabg|angioplasty|valve|stent|cardiolog/i.test(lowerMsg);
  // Cancer / Oncology
  const isCancer = /cancer|tumor|chemo|oncolog|biopsy|radiation|leukemia/i.test(lowerMsg);
  // Orthopedic / Joint
  const isOrtho = /knee|hip|spine|joint|bone|ortho|disc/i.test(lowerMsg);
  // Organ Transplant
  const isTransplant = /transplant|kidney|liver|donor/i.test(lowerMsg);
  // Cost / Price
  const isPriceQuery = /how much|cost|price|estimate|charges|fees|package/i.test(lowerMsg);
  // Visa / Travel
  const isVisaQuery = /visa|flight|airport|hotel|tickets|invitation/i.test(lowerMsg);
  // Reports / Tests
  const hasReports = /report|mri|ct scan|x-ray|blood test|discharge summary|scan/i.test(lowerMsg);

  let reply = "";
  let extractedUpdates: ConciergeInteractionOutput["extractedUpdates"] = undefined;
  let suggestedNextStage: string | undefined = undefined;

  // Organization-specific messaging nuances
  const orgPhrase = config.organizationType === "hospital"
    ? `our clinical team at ${orgName}`
    : config.organizationType === "medical_tourism_company"
    ? `our partner hospital specialists through ${orgName}`
    : `our medical advisory network`;

  if (isGreeting && patientMessage.trim().split(/\s+/).length <= 4) {
    reply = `Hello! I am ${agentName} with ${orgName}. How can I assist you or your family with medical care today?`;
  } else if (isPriceQuery) {
    const curr = config.defaultCurrency;
    reply = `Procedure costs vary depending on the patient's exact medical condition and surgeon evaluation. Our package specialist, ${config.agents.nuvio_estimator.displayName}, can provide estimated ranges in ${curr} once we have basic medical reports. Has a doctor already recommended a specific surgery?`;
    suggestedNextStage = "treatment_estimate_pending";
  } else if (isVisaQuery) {
    reply = `We provide complete medical visa assistance and official invitation letters for international patients and their attendants. Have you or the patient already obtained a valid international passport?`;
    suggestedNextStage = "visa_assistance";
  } else if (hasReports) {
    reply = `Thank you for sharing that you have medical records. Our clinical coordinator, ${config.agents.nuvio_clinical.displayName}, can review them with ${orgPhrase}. Would you like us to review them for a doctor consultation?`;
    suggestedNextStage = "ready_for_clinical_review";
  } else if (isCardiac) {
    reply = `I understand. We can help you coordinate specialized cardiac care with ${orgPhrase}. Has the patient already undergone an angiogram or recent echocardiogram?`;
    extractedUpdates = { specialty: "Cardiology & Cardiac Surgery", complaint: patientMessage };
    suggestedNextStage = "patient_qualification";
  } else if (isCancer) {
    reply = `I understand you are seeking oncology evaluation. We can help arrange review by senior cancer specialists. Do you currently have recent biopsy or imaging reports available?`;
    extractedUpdates = { specialty: "Oncology & Bone Marrow Transplant", complaint: patientMessage };
    suggestedNextStage = "patient_qualification";
  } else if (isOrtho) {
    reply = `We can gladly assist you with orthopedic evaluation and joint treatment. Has a doctor already recommended surgery, and do you have recent X-rays or MRI scans?`;
    extractedUpdates = { specialty: "Orthopedics & Joint Replacement", complaint: patientMessage };
    suggestedNextStage = "patient_qualification";
  } else if (isTransplant) {
    reply = `Organ transplant requires comprehensive clinical evaluation and regulatory compliance. Our team at ${orgName} can guide you through the process. What type of transplant evaluation is needed?`;
    extractedUpdates = { specialty: "Organ Transplant", complaint: patientMessage };
    suggestedNextStage = "patient_qualification";
  } else {
    // Default empathetic coordinator response (1-2 sentences)
    if (dossier?.personal.name) {
      reply = `Thank you for the update, ${dossier.personal.name}. I have noted this for ${orgPhrase}. What is the most convenient time for our coordinator to assist you further?`;
    } else {
      reply = `Thank you for reaching out to ${orgName}. I can help you coordinate the care you need. Could you share what city or country you are traveling from?`;
    }
  }

  return {
    reply,
    emergencyDetected: false,
    activeAgent: "nuvio_concierge",
    extractedUpdates,
    suggestedNextStage,
  };
}
