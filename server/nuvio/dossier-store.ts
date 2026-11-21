/**
 * Nuvio Medical Tourism Platform - Patient Dossier & Hospital Configuration Store
 * Handles persistence, indexing, duplicate detection, and stage transitions on the local VPS.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { writeFileAtomic } from "../atomic.ts";
import {
  type NuvioPatientDossier,
  type PatientDossierInput,
  type PatientJourneyStage,
  type TimelineEvent,
  canTransitionStage,
  patientDossierSchema,
} from "../../shared/nuvio/patient-journey.ts";
import {
  type NuvioHospitalConfig,
  type NuvioHospitalConfigInput,
  DEFAULT_HOSPITAL_CONFIG,
  hospitalConfigSchema,
} from "../../shared/nuvio/hospital-config.ts";

export interface DossierStoreOptions {
  dataDir: string;
}

export function stageDefaultAgent(stage: PatientJourneyStage): string {
  switch (stage) {
    case "lead_captured":
    case "contacted":
    case "qualified":
      return "nuvio_concierge";
    case "doctor_consultation":
    case "in_treatment":
    case "post_treatment_followup":
      return "nuvio_clinical";
    case "estimate_shared":
      return "nuvio_estimator";
    case "visa_assistance":
    case "travel_coordinated":
      return "nuvio_travel";
    case "closed":
      return "nuvio_concierge";
  }
}

export class NuvioDossierStore {
  private readonly baseDir: string;
  private readonly dossiersDir: string;
  private readonly configFile: string;

  constructor(options: DossierStoreOptions) {
    this.baseDir = join(options.dataDir, "nuvio");
    this.dossiersDir = join(this.baseDir, "dossiers");
    this.configFile = join(this.baseDir, "hospital-config.json");
    this.ensureDirs();
  }

  private ensureDirs(): void {
    if (!existsSync(this.baseDir)) mkdirSync(this.baseDir, { recursive: true });
    if (!existsSync(this.dossiersDir)) mkdirSync(this.dossiersDir, { recursive: true });
  }

  // --- Hospital Config Operations ---

  getHospitalConfig(): NuvioHospitalConfig {
    this.ensureDirs();
    if (!existsSync(this.configFile)) {
      this.saveHospitalConfig(DEFAULT_HOSPITAL_CONFIG);
      return DEFAULT_HOSPITAL_CONFIG;
    }
    try {
      const raw = readFileSync(this.configFile, "utf-8");
      return hospitalConfigSchema.parse(JSON.parse(raw));
    } catch {
      return DEFAULT_HOSPITAL_CONFIG;
    }
  }

  saveHospitalConfig(config: NuvioHospitalConfigInput): NuvioHospitalConfig {
    this.ensureDirs();
    const validated = hospitalConfigSchema.parse(config);
    writeFileAtomic(this.configFile, JSON.stringify(validated, null, 2));
    return validated;
  }

  // --- Patient Dossier CRUD Operations ---

  private dossierPath(patientId: string): string {
    const safeId = patientId.replace(/[^a-zA-Z0-9_-]/g, "_");
    return join(this.dossiersDir, `${safeId}.json`);
  }

  getDossier(patientId: string): NuvioPatientDossier | null {
    const path = this.dossierPath(patientId);
    if (!existsSync(path)) return null;
    try {
      const raw = readFileSync(path, "utf-8");
      return patientDossierSchema.parse(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  saveDossier(input: PatientDossierInput): NuvioPatientDossier {
    this.ensureDirs();
    const dossier = patientDossierSchema.parse(input);
    const path = this.dossierPath(dossier.patientId);
    writeFileAtomic(path, JSON.stringify(dossier, null, 2));
    return dossier;
  }

  listDossiers(): NuvioPatientDossier[] {
    this.ensureDirs();
    const files = readdirSync(this.dossiersDir).filter((f) => f.endsWith(".json"));
    const results: NuvioPatientDossier[] = [];
    for (const file of files) {
      try {
        const raw = readFileSync(join(this.dossiersDir, file), "utf-8");
        results.push(patientDossierSchema.parse(JSON.parse(raw)));
      } catch {
        // Skip corrupted or incomplete files
      }
    }
    // Return sorted newest inquiry first
    return results.sort((a, b) => b.inquiryDate - a.inquiryDate);
  }

  // --- Duplicate Detection ---

  findDuplicate(phone?: string, email?: string): NuvioPatientDossier | null {
    if (!phone && !email) return null;
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, "") : null;
    const cleanEmail = email ? email.trim().toLowerCase() : null;

    const all = this.listDossiers();
    for (const dossier of all) {
      if (cleanEmail && dossier.personal.email && dossier.personal.email.trim().toLowerCase() === cleanEmail) {
        return dossier;
      }
      if (cleanPhone && dossier.personal.phone) {
        const storedPhone = dossier.personal.phone.replace(/[^0-9]/g, "");
        if (storedPhone.length > 5 && (storedPhone.endsWith(cleanPhone) || cleanPhone.endsWith(storedPhone))) {
          return dossier;
        }
      }
    }
    return null;
  }

  // --- Stage Transition & Timeline Management ---

  transitionStage(
    patientId: string,
    targetStage: PatientJourneyStage,
    actor: string,
    note: string
  ): NuvioPatientDossier {
    const existing = this.getDossier(patientId);
    if (!existing) {
      throw new Error(`Patient dossier not found for ID: ${patientId}`);
    }

    if (!canTransitionStage(existing.stage, targetStage)) {
      throw new Error(`Invalid stage transition from ${existing.stage} to ${targetStage}`);
    }

    const event: TimelineEvent = {
      at: Date.now(),
      stage: targetStage,
      actor,
      note,
    };

    const nextAgent = stageDefaultAgent(targetStage);
    const updated: NuvioPatientDossier = {
      ...existing,
      stage: targetStage,
      activeAgent: nextAgent,
      timeline: [...existing.timeline, event],
    };

    return this.saveDossier(updated);
  }
}
