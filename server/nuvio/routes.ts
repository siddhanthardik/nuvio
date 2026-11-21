/**
 * Nuvio Medical Tourism Platform - REST API Routes
 * Exposes hospital configuration, patient dossiers, multi-agent workflows, and human review gates.
 */
import { PASS, type RouteContext, type RouteHandler } from "../routes/table.ts";
import { NuvioDossierStore } from "./dossier-store.ts";
import { ingestInquiry, type NewInquiryPayload } from "./workflow.ts";
import { PATIENT_JOURNEY_STAGES, type PatientJourneyStage } from "../../shared/nuvio/patient-journey.ts";

export interface NuvioRoutesOptions {
  dataDir: string;
}

export function createNuvioRoutes(options: NuvioRoutesOptions): RouteHandler {
  const store = new NuvioDossierStore({ dataDir: options.dataDir });

  return async (ctx: RouteContext) => {
    const { req, res, path, method, json, readBody } = ctx;

    if (!path.startsWith("/api/nuvio")) {
      return PASS;
    }

    // 1. Hospital Config: GET /api/nuvio/config
    if (path === "/api/nuvio/config") {
      if (method === "GET") {
        const config = store.getHospitalConfig();
        return json(res, 200, { ok: true, config });
      }
      if (method === "PUT" || method === "POST") {
        try {
          const body = JSON.parse(await readBody(req));
          const updated = store.saveHospitalConfig(body);
          return json(res, 200, { ok: true, config: updated });
        } catch (err) {
          return json(res, 400, { ok: false, error: err instanceof Error ? err.message : "Invalid config format" });
        }
      }
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    // 2. Patient Dossiers: GET /api/nuvio/dossiers
    if (path === "/api/nuvio/dossiers") {
      if (method === "GET") {
        const dossiers = store.listDossiers();
        return json(res, 200, { ok: true, count: dossiers.length, dossiers });
      }
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    // 3. New Inquiry Intake: POST /api/nuvio/inquiry
    if (path === "/api/nuvio/inquiry") {
      if (method === "POST") {
        try {
          const body = JSON.parse(await readBody(req)) as NewInquiryPayload;
          if (!body.name || !body.country || !body.source) {
            return json(res, 400, {
              ok: false,
              error: "Missing required inquiry fields: name, country, and source are required.",
            });
          }
          const result = ingestInquiry(store, body);
          return json(res, result.isDuplicate ? 200 : 201, { ok: true, ...result });
        } catch (err) {
          return json(res, 400, { ok: false, error: err instanceof Error ? err.message : "Invalid payload" });
        }
      }
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    // 4. Single Dossier by ID: /api/nuvio/dossiers/:id
    const dossierMatch = path.match(/^\/api\/nuvio\/dossiers\/([^/]+)$/);
    if (dossierMatch) {
      const patientId = decodeURIComponent(dossierMatch[1]!);
      if (method === "GET") {
        const dossier = store.getDossier(patientId);
        if (!dossier) {
          return json(res, 404, { ok: false, error: "Patient record not found" });
        }
        return json(res, 200, { ok: true, dossier });
      }
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    // 5. Stage Transition: POST /api/nuvio/dossiers/:id/stage
    const stageMatch = path.match(/^\/api\/nuvio\/dossiers\/([^/]+)\/stage$/);
    if (stageMatch) {
      const patientId = decodeURIComponent(stageMatch[1]!);
      if (method === "POST") {
        try {
          const body = JSON.parse(await readBody(req)) as {
            stage: PatientJourneyStage;
            actor?: string;
            note?: string;
          };

          if (!body.stage || !PATIENT_JOURNEY_STAGES.includes(body.stage)) {
            return json(res, 400, { ok: false, error: "Invalid target stage" });
          }

          const updated = store.transitionStage(
            patientId,
            body.stage,
            body.actor || "hospital_coordinator",
            body.note || `Transitioned stage to ${body.stage}`
          );

          return json(res, 200, { ok: true, dossier: updated });
        } catch (err) {
          return json(res, 400, { ok: false, error: err instanceof Error ? err.message : "Failed to transition stage" });
        }
      }
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    // 6. Human Approval Sign-off Gate: POST /api/nuvio/dossiers/:id/approve
    const approveMatch = path.match(/^\/api\/nuvio\/dossiers\/([^/]+)\/approve$/);
    if (approveMatch) {
      const patientId = decodeURIComponent(approveMatch[1]!);
      if (method === "POST") {
        try {
          const body = JSON.parse(await readBody(req)) as {
            type: "estimate" | "visa";
            approvedBy: string;
            note?: string;
          };

          const dossier = store.getDossier(patientId);
          if (!dossier) {
            return json(res, 404, { ok: false, error: "Patient record not found" });
          }

          const now = Date.now();
          if (body.type === "estimate") {
            dossier.estimate.approvedByCoordinator = true;
            dossier.estimate.approvedAt = now;
            dossier.estimate.approvedBy = body.approvedBy;
          } else if (body.type === "visa") {
            dossier.visaTravel.visaInvitationIssued = true;
          }

          dossier.pendingHumanReview = { needed: false };
          dossier.timeline.push({
            at: now,
            stage: dossier.stage,
            actor: body.approvedBy,
            note: body.note || `Human approval confirmed for ${body.type}`,
          });

          const saved = store.saveDossier(dossier);
          return json(res, 200, { ok: true, dossier: saved });
        } catch (err) {
          return json(res, 400, { ok: false, error: err instanceof Error ? err.message : "Approval failed" });
        }
      }
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    return PASS;
  };
}
