/**
 * Nuvio Medical Tourism Platform - REST API Routes
 * Exposes organization profile, setup wizard onboarding, live dashboard KPIs,
 * patient dossiers, follow-ups, consultations, document tracking, coordinator tasks,
 * communication queue, and lead nurturing automation.
 */
import { PASS, type RouteContext, type RouteHandler } from "../routes/table.ts";
import { NuvioDossierStore } from "./dossier-store.ts";
import { ingestInquiry, type NewInquiryPayload } from "./workflow.ts";
import { computeDashboardMetrics } from "./dashboard.ts";
import { generateConciergeResponse } from "./concierge.ts";
import type { Consultation, FollowUp, PatientDocument } from "../../shared/nuvio/patient-journey.ts";
import type { NuvioOrganizationConfigInput } from "../../shared/nuvio/organization-config.ts";
import type {
  CommunicationQueueItem,
  CommunicationStatus,
  CoordinatorTask,
  TaskCategory,
  TaskPriority,
  TaskStatus,
} from "../../shared/nuvio/patient-operations.ts";

export interface NuvioRoutesOptions {
  dataDir: string;
}

export function createNuvioRoutes(options: NuvioRoutesOptions): RouteHandler {
  const store = new NuvioDossierStore({ dataDir: options.dataDir });

  return async (ctx: RouteContext) => {
    const { req, res, path, method, json, readBody, url } = ctx;

    if (!path.startsWith("/api/nuvio")) {
      return PASS;
    }

    // 1. Organization Profile: /api/nuvio/organization (and legacy /api/nuvio/config)
    if (path === "/api/nuvio/organization" || path === "/api/nuvio/config") {
      if (method === "GET") {
        const config = store.getOrganizationConfig();
        return json(res, 200, { ok: true, config });
      }
      if (method === "PUT" || method === "POST") {
        try {
          const body = JSON.parse(await readBody(req)) as NuvioOrganizationConfigInput;
          const updated = store.saveOrganizationConfig(body);
          return json(res, 200, { ok: true, config: updated });
        } catch (err) {
          return json(res, 400, { ok: false, error: err instanceof Error ? err.message : "Invalid configuration format" });
        }
      }
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    // 2. Setup Wizard Onboarding: POST /api/nuvio/onboarding
    if (path === "/api/nuvio/onboarding") {
      if (method === "POST") {
        try {
          const body = JSON.parse(await readBody(req)) as Record<string, unknown>;
          if (!body.organizationType || !body.organizationName) {
            return json(res, 400, {
              ok: false,
              error: "Organization type and organization name are required for onboarding.",
            });
          }
          const completed = store.completeOnboarding(body as Partial<NuvioOrganizationConfigInput>);
          return json(res, 200, {
            ok: true,
            message: "Nuvio organization onboarding completed successfully.",
            config: completed,
          });
        } catch (err) {
          return json(res, 400, { ok: false, error: err instanceof Error ? err.message : "Onboarding failed" });
        }
      }
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    // 3. Operational Dashboard Metrics: GET /api/nuvio/dashboard
    if (path === "/api/nuvio/dashboard") {
      if (method === "GET") {
        const metrics = computeDashboardMetrics(store);
        const config = store.getOrganizationConfig();
        return json(res, 200, {
          ok: true,
          organization: {
            name: config.organizationName,
            type: config.organizationType,
            country: config.country,
            location: config.operatingLocation,
          },
          metrics,
        });
      }
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    // 4. Operations: Search & Filter Patient Cases: GET /api/nuvio/operations/patients
    if (path === "/api/nuvio/operations/patients") {
      if (method === "GET") {
        const search = url.searchParams.get("search") || undefined;
        const stage = url.searchParams.get("stage") || undefined;
        const coordinator = url.searchParams.get("coordinator") || undefined;
        const hasOverdueFollowups = url.searchParams.get("overdue") === "true";
        const hasPendingDocuments = url.searchParams.get("pendingDocs") === "true";
        const hasConsultationRequests = url.searchParams.get("consults") === "true";
        const needsResponse = url.searchParams.get("needsResponse") === "true";

        const dossiers = store.searchAndFilterDossiers({
          search,
          stage,
          coordinator,
          hasOverdueFollowups,
          hasPendingDocuments,
          hasConsultationRequests,
          needsResponse,
        });

        return json(res, 200, { ok: true, count: dossiers.length, dossiers });
      }
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    // 5. Operations: Coordinator Tasks: /api/nuvio/operations/tasks
    if (path === "/api/nuvio/operations/tasks") {
      if (method === "GET") {
        const status = (url.searchParams.get("status") as TaskStatus) || undefined;
        const priority = (url.searchParams.get("priority") as TaskPriority) || undefined;
        const patientId = url.searchParams.get("patientId") || undefined;
        const category = (url.searchParams.get("category") as TaskCategory) || undefined;

        const tasks = store.listTasks({ status, priority, patientId, category });
        return json(res, 200, { ok: true, count: tasks.length, tasks });
      }
      if (method === "POST") {
        try {
          const body = JSON.parse(await readBody(req)) as Omit<CoordinatorTask, "id" | "createdAt">;
          if (!body.patientId || !body.title || !body.category) {
            return json(res, 400, { ok: false, error: "patientId, title, and category are required." });
          }
          const task = store.createTask({
            ...body,
            dueDate: body.dueDate || Date.now() + 24 * 3600 * 1000,
          });
          return json(res, 201, { ok: true, task });
        } catch (err) {
          return json(res, 400, { ok: false, error: err instanceof Error ? err.message : "Failed to create task" });
        }
      }
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    const taskItemMatch = path.match(/^\/api\/nuvio\/operations\/tasks\/([^/]+)$/);
    if (taskItemMatch) {
      const taskId = decodeURIComponent(taskItemMatch[1]!);
      if (method === "PUT" || method === "PATCH") {
        try {
          const patch = JSON.parse(await readBody(req)) as Partial<CoordinatorTask>;
          const updated = store.updateTask(taskId, patch);
          return json(res, 200, { ok: true, task: updated });
        } catch (err) {
          return json(res, 400, { ok: false, error: err instanceof Error ? err.message : "Failed to update task" });
        }
      }
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    // 6. Operations: Communication Queue: /api/nuvio/operations/communication-queue
    if (path === "/api/nuvio/operations/communication-queue") {
      if (method === "GET") {
        const status = (url.searchParams.get("status") as CommunicationStatus) || undefined;
        const patientId = url.searchParams.get("patientId") || undefined;
        const queue = store.listCommunicationQueue({ status, patientId });
        return json(res, 200, { ok: true, count: queue.length, queue });
      }
      if (method === "POST") {
        try {
          const body = JSON.parse(await readBody(req)) as Omit<CommunicationQueueItem, "id" | "createdAt">;
          if (!body.patientId || !body.draftMessage || !body.purpose) {
            return json(res, 400, { ok: false, error: "patientId, draftMessage, and purpose are required." });
          }
          const draft = store.createCommunicationDraft(body);
          return json(res, 201, { ok: true, draft });
        } catch (err) {
          return json(res, 400, { ok: false, error: err instanceof Error ? err.message : "Failed to create draft" });
        }
      }
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    const commApproveMatch = path.match(/^\/api\/nuvio\/operations\/communication-queue\/([^/]+)\/approve$/);
    if (commApproveMatch) {
      const draftId = decodeURIComponent(commApproveMatch[1]!);
      if (method === "POST") {
        try {
          const body = JSON.parse(await readBody(req)) as { reviewedBy?: string };
          const approved = store.approveCommunicationDraft(draftId, body.reviewedBy || "coordinator");
          return json(res, 200, { ok: true, draft: approved });
        } catch (err) {
          return json(res, 400, { ok: false, error: err instanceof Error ? err.message : "Approval failed" });
        }
      }
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    const commRejectMatch = path.match(/^\/api\/nuvio\/operations\/communication-queue\/([^/]+)\/reject$/);
    if (commRejectMatch) {
      const draftId = decodeURIComponent(commRejectMatch[1]!);
      if (method === "POST") {
        try {
          const body = JSON.parse(await readBody(req)) as { reviewedBy?: string; reason?: string };
          const rejected = store.rejectCommunicationDraft(draftId, body.reviewedBy || "coordinator", body.reason);
          return json(res, 200, { ok: true, draft: rejected });
        } catch (err) {
          return json(res, 400, { ok: false, error: err instanceof Error ? err.message : "Rejection failed" });
        }
      }
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    const commEditMatch = path.match(/^\/api\/nuvio\/operations\/communication-queue\/([^/]+)$/);
    if (commEditMatch) {
      const draftId = decodeURIComponent(commEditMatch[1]!);
      if (method === "PUT" || method === "PATCH") {
        try {
          const patch = JSON.parse(await readBody(req)) as Partial<CommunicationQueueItem>;
          const updated = store.updateCommunicationDraft(draftId, patch);
          return json(res, 200, { ok: true, draft: updated });
        } catch (err) {
          return json(res, 400, { ok: false, error: err instanceof Error ? err.message : "Update failed" });
        }
      }
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    // 7. Operations: Run Lead Nurturing Rules: POST /api/nuvio/operations/evaluate-nurturing
    if (path === "/api/nuvio/operations/evaluate-nurturing") {
      if (method === "POST") {
        try {
          const body = JSON.parse(await readBody(req).catch(() => "{}")) as { patientId?: string };
          const result = store.runNurturingAutomation(body.patientId);
          return json(res, 200, { ok: true, ...result });
        } catch (err) {
          return json(res, 400, { ok: false, error: err instanceof Error ? err.message : "Nurturing evaluation failed" });
        }
      }
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    // 8. Patient Dossiers List: GET /api/nuvio/dossiers
    if (path === "/api/nuvio/dossiers") {
      if (method === "GET") {
        const dossiers = store.listDossiers();
        return json(res, 200, { ok: true, count: dossiers.length, dossiers });
      }
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    // 9. New Inquiry Intake: POST /api/nuvio/inquiry
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
          // Automatically run lead nurturing evaluation for the newly ingested inquiry
          store.runNurturingAutomation(result.dossier.patientId);
          return json(res, result.isDuplicate ? 200 : 201, { ok: true, ...result });
        } catch (err) {
          return json(res, 400, { ok: false, error: err instanceof Error ? err.message : "Invalid payload" });
        }
      }
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    // 10. Concierge Message Simulator / Reply: POST /api/nuvio/concierge/reply
    if (path === "/api/nuvio/concierge/reply") {
      if (method === "POST") {
        try {
          const body = JSON.parse(await readBody(req)) as {
            message: string;
            patientId?: string;
          };
          if (!body.message) {
            return json(res, 400, { ok: false, error: "Message is required." });
          }
          const config = store.getOrganizationConfig();
          const dossier = body.patientId ? store.getDossier(body.patientId) : null;
          const result = generateConciergeResponse({
            patientMessage: body.message,
            config,
            dossier,
          });
          return json(res, 200, { ok: true, ...result });
        } catch (err) {
          return json(res, 400, { ok: false, error: err instanceof Error ? err.message : "Failed to generate reply" });
        }
      }
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    // 11. Follow-up Operations: /api/nuvio/dossiers/:id/followups
    const followUpsMatch = path.match(/^\/api\/nuvio\/dossiers\/([^/]+)\/followups$/);
    if (followUpsMatch) {
      const patientId = decodeURIComponent(followUpsMatch[1]!);
      if (method === "POST") {
        try {
          const body = JSON.parse(await readBody(req)) as {
            dueDate: number;
            reason: string;
            nextAction: string;
            assignedCoordinator?: string;
            notes?: string;
          };
          if (!body.dueDate || !body.reason || !body.nextAction) {
            return json(res, 400, { ok: false, error: "dueDate, reason, and nextAction are required." });
          }
          const updated = store.addFollowUp(patientId, body);
          return json(res, 201, { ok: true, dossier: updated });
        } catch (err) {
          return json(res, 400, { ok: false, error: err instanceof Error ? err.message : "Failed to add follow-up" });
        }
      }
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    const followUpItemMatch = path.match(/^\/api\/nuvio\/dossiers\/([^/]+)\/followups\/([^/]+)$/);
    if (followUpItemMatch) {
      const patientId = decodeURIComponent(followUpItemMatch[1]!);
      const followUpId = decodeURIComponent(followUpItemMatch[2]!);
      if (method === "PUT" || method === "PATCH") {
        try {
          const patch = JSON.parse(await readBody(req)) as Partial<FollowUp>;
          const updated = store.updateFollowUp(patientId, followUpId, patch);
          return json(res, 200, { ok: true, dossier: updated });
        } catch (err) {
          return json(res, 400, { ok: false, error: err instanceof Error ? err.message : "Failed to update follow-up" });
        }
      }
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    // 12. Consultation Operations: /api/nuvio/dossiers/:id/consultations
    const consultMatch = path.match(/^\/api\/nuvio\/dossiers\/([^/]+)\/consultations$/);
    if (consultMatch) {
      const patientId = decodeURIComponent(consultMatch[1]!);
      if (method === "POST") {
        try {
          const body = JSON.parse(await readBody(req)) as {
            requestedDate?: string;
            preferredTimeSlot?: string;
            doctorName?: string;
            department?: string;
            hospitalName?: string;
            mode?: "video" | "in_person" | "telephonic";
            coordinatorNotes?: string;
          };
          const updated = store.requestConsultation(patientId, body);
          return json(res, 201, { ok: true, dossier: updated });
        } catch (err) {
          return json(res, 400, { ok: false, error: err instanceof Error ? err.message : "Failed to request consultation" });
        }
      }
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    const consultItemMatch = path.match(/^\/api\/nuvio\/dossiers\/([^/]+)\/consultations\/([^/]+)$/);
    if (consultItemMatch) {
      const patientId = decodeURIComponent(consultItemMatch[1]!);
      const consultId = decodeURIComponent(consultItemMatch[2]!);
      if (method === "PUT" || method === "PATCH") {
        try {
          const patch = JSON.parse(await readBody(req)) as Partial<Consultation>;
          const updated = store.updateConsultation(patientId, consultId, patch);
          return json(res, 200, { ok: true, dossier: updated });
        } catch (err) {
          return json(res, 400, { ok: false, error: err instanceof Error ? err.message : "Failed to update consultation" });
        }
      }
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    // 13. Document Coordination Operations: /api/nuvio/dossiers/:id/documents
    const docMatch = path.match(/^\/api\/nuvio\/dossiers\/([^/]+)\/documents$/);
    if (docMatch) {
      const patientId = decodeURIComponent(docMatch[1]!);
      if (method === "POST") {
        try {
          const body = JSON.parse(await readBody(req)) as {
            name: string;
            category: PatientDocument["category"];
            notes?: string;
          };
          if (!body.name) {
            return json(res, 400, { ok: false, error: "Document name is required." });
          }
          const updated = store.requestDocument(patientId, body);
          return json(res, 201, { ok: true, dossier: updated });
        } catch (err) {
          return json(res, 400, { ok: false, error: err instanceof Error ? err.message : "Failed to request document" });
        }
      }
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    const docItemMatch = path.match(/^\/api\/nuvio\/dossiers\/([^/]+)\/documents\/([^/]+)$/);
    if (docItemMatch) {
      const patientId = decodeURIComponent(docItemMatch[1]!);
      const docId = decodeURIComponent(docItemMatch[2]!);
      if (method === "PUT" || method === "PATCH") {
        try {
          const patch = JSON.parse(await readBody(req)) as Partial<PatientDocument>;
          const updated = store.updateDocumentStatus(patientId, docId, patch);
          return json(res, 200, { ok: true, dossier: updated });
        } catch (err) {
          return json(res, 400, { ok: false, error: err instanceof Error ? err.message : "Failed to update document" });
        }
      }
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    // 14. Single Dossier by ID: /api/nuvio/dossiers/:id
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

    // 15. Stage Transition: POST /api/nuvio/dossiers/:id/stage
    const stageMatch = path.match(/^\/api\/nuvio\/dossiers\/([^/]+)\/stage$/);
    if (stageMatch) {
      const patientId = decodeURIComponent(stageMatch[1]!);
      if (method === "POST") {
        try {
          const body = JSON.parse(await readBody(req)) as {
            stage: string;
            actor?: string;
            note?: string;
          };

          if (!body.stage) {
            return json(res, 400, { ok: false, error: "Target stage is required." });
          }

          const updated = store.transitionStage(
            patientId,
            body.stage,
            body.actor || "coordinator",
            body.note || `Transitioned stage to ${body.stage}`
          );

          // Evaluate lead nurturing for the new stage
          store.runNurturingAutomation(patientId);

          return json(res, 200, { ok: true, dossier: updated });
        } catch (err) {
          return json(res, 400, { ok: false, error: err instanceof Error ? err.message : "Failed to transition stage" });
        }
      }
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    // 16. Human Approval Sign-off Gate: POST /api/nuvio/dossiers/:id/approve
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
            eventType: "coordinator_action_completed",
            requiresHumanApproval: true,
            approved: true,
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
