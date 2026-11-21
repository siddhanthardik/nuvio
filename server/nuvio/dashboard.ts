/**
 * Nuvio Medical Tourism Platform - Operational Dashboard Metrics Engine
 * Aggregates live operational KPIs directly from persisted patient dossiers.
 * Uses 100% real persisted data without dummy statistics or fabricated counts.
 */
import { NuvioDossierStore } from "./dossier-store.ts";

export interface DashboardMetrics {
  totalPatients: number;
  newEnquiries: number;
  activeLeads: number;
  followUpsDue: number;
  documentsPending: number;
  consultationRequests: number;
  upcomingConfirmedConsultations: number;
  leadsAwaitingCoordinatorAction: number;
  byStage: Record<string, number>;
  bySpecialty: Record<string, number>;
  byCountry: Record<string, number>;
  recentDossiers: Array<{
    patientId: string;
    name: string;
    country: string;
    specialty: string;
    stage: string;
    inquiryDate: number;
    activeAgent: string;
    needsAction: boolean;
  }>;
}

export function computeDashboardMetrics(store: NuvioDossierStore): DashboardMetrics {
  const dossiers = store.listDossiers();
  const now = Date.now();

  let newEnquiries = 0;
  let activeLeads = 0;
  let followUpsDue = 0;
  let documentsPending = 0;
  let consultationRequests = 0;
  let upcomingConfirmedConsultations = 0;
  let leadsAwaitingCoordinatorAction = 0;

  const byStage: Record<string, number> = {};
  const bySpecialty: Record<string, number> = {};
  const byCountry: Record<string, number> = {};

  for (const d of dossiers) {
    // Stage counts
    byStage[d.stage] = (byStage[d.stage] || 0) + 1;

    // Specialty counts
    const spec = d.clinical.specialty || "General";
    bySpecialty[spec] = (bySpecialty[spec] || 0) + 1;

    // Country counts
    const country = d.personal.country || "Unknown";
    byCountry[country] = (byCountry[country] || 0) + 1;

    // New enquiries
    if (d.stage === "new_enquiry" || d.stage === "lead_captured") {
      newEnquiries += 1;
    }

    // Active leads (not closed, not lost)
    if (d.stage !== "closed" && d.stage !== "lost_inactive") {
      activeLeads += 1;
    }

    // Follow-ups due
    if (Array.isArray(d.followUps)) {
      for (const fu of d.followUps) {
        if (fu.status === "scheduled" && fu.dueDate <= now + 24 * 60 * 60 * 1000) {
          followUpsDue += 1;
        }
      }
    }

    // Documents pending
    if (Array.isArray(d.documents)) {
      for (const doc of d.documents) {
        if (doc.status === "requested" || doc.status === "received" || doc.status === "under_review") {
          documentsPending += 1;
        }
      }
    }

    // Consultations
    if (Array.isArray(d.consultations)) {
      for (const c of d.consultations) {
        if (c.schedulingStatus === "requested" || c.schedulingStatus === "coordinator_review") {
          consultationRequests += 1;
        } else if (c.schedulingStatus === "confirmed") {
          upcomingConfirmedConsultations += 1;
        }
      }
    }

    // Awaiting coordinator action
    if (d.pendingHumanReview?.needed || d.stage === "ready_for_clinical_review" || d.stage === "treatment_estimate_pending") {
      leadsAwaitingCoordinatorAction += 1;
    }
  }

  // Top recent dossiers for coordinator view
  const recentDossiers = dossiers.slice(0, 10).map((d) => ({
    patientId: d.patientId,
    name: d.personal.name,
    country: d.personal.country,
    specialty: d.clinical.specialty || "General",
    stage: d.stage,
    inquiryDate: d.inquiryDate,
    activeAgent: d.activeAgent,
    needsAction: Boolean(d.pendingHumanReview?.needed),
  }));

  return {
    totalPatients: dossiers.length,
    newEnquiries,
    activeLeads,
    followUpsDue,
    documentsPending,
    consultationRequests,
    upcomingConfirmedConsultations,
    leadsAwaitingCoordinatorAction,
    byStage,
    bySpecialty,
    byCountry,
    recentDossiers,
  };
}
