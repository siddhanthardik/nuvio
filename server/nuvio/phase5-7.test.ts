import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createNuvioRoutes } from "./routes.ts";
import type { RouteContext } from "../routes/table.ts";
import { ingestInquiry } from "./workflow.ts";
import { NuvioDossierStore } from "./dossier-store.ts";

function createMockContext(
  method: string,
  path: string,
  bodyData: unknown,
  searchParams?: Record<string, string>,
): {
  ctx: RouteContext;
  getResponse: () => { status: number; body: Record<string, unknown>; text?: string };
} {
  let responseStatus = 200;
  let responseBody: Record<string, unknown> = {};
  let rawText: string | undefined;

  const json = (_res: ServerResponse, status: number, data: unknown) => {
    responseStatus = status;
    responseBody = data as Record<string, unknown>;
  };

  const readBody = async () => bodyData;

  const url = new URL(`http://localhost:8799${path}`);
  if (searchParams) {
    for (const [key, val] of Object.entries(searchParams)) {
      url.searchParams.set(key, val);
    }
  }

  const mockRes = {
    writeHead: (status: number) => {
      responseStatus = status;
    },
    end: (chunk?: unknown) => {
      if (typeof chunk === "string") {
        rawText = chunk;
      }
    },
  } as unknown as ServerResponse;

  const ctx = {
    req: {} as IncomingMessage,
    res: mockRes,
    url,
    path: url.pathname,
    method,
    auth: {} as RouteContext["auth"],
    json: json as RouteContext["json"],
    readBody: readBody as RouteContext["readBody"],
  };

  return {
    ctx,
    getResponse: () => ({ status: responseStatus, body: responseBody, text: rawText }),
  };
}

describe("Nuvio Phases 4-7: Approvals, Ad Leads, WhatsApp & Voice Integration", () => {
  // Phase 4: Human Coordinator Approval Gate
  it("approves treatment estimate and visa via POST /api/nuvio/dossiers/:id/approve", async () => {
    const dir = mkdtempSync(join(tmpdir(), "nuvio-p57-test-"));
    try {
      const store = new NuvioDossierStore({ dataDir: dir });
      const handler = createNuvioRoutes({ dataDir: dir });

      const intake = ingestInquiry(store, {
        name: "Yusuf Al-Hassan",
        country: "UAE",
        phone: "+971 50 123 4567",
        specialty: "Orthopedics",
        source: "website",
      });
      const patientId = intake.dossier.patientId;

      // 1. Approve Estimate
      const { ctx: ctx1, getResponse: getRes1 } = createMockContext(
        "POST",
        `/api/nuvio/dossiers/${patientId}/approve`,
        { type: "estimate", approvedBy: "Senior Coordinator Sarah" },
      );
      await handler(ctx1);
      const res1 = getRes1();
      expect(res1.status).toBe(200);
      expect(res1.body.ok).toBe(true);
      const d1 = res1.body.dossier as any;
      expect(d1.estimate.approvedByCoordinator).toBe(true);
      expect(d1.estimate.approvedBy).toBe("Senior Coordinator Sarah");
      expect(d1.pendingHumanReview.needed).toBe(false);

      // 2. Approve Visa
      const { ctx: ctx2, getResponse: getRes2 } = createMockContext(
        "POST",
        `/api/nuvio/dossiers/${patientId}/approve`,
        { type: "visa", approvedBy: "Coordinator Priya" },
      );
      await handler(ctx2);
      const res2 = getRes2();
      expect(res2.status).toBe(200);
      expect(res2.body.ok).toBe(true);
      const d2 = res2.body.dossier as any;
      expect(d2.visaTravel.visaInvitationIssued).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // Phase 5: Public Website Lead Intake
  it("captures public patient inquiry via POST /api/nuvio/public/inquiry", async () => {
    const dir = mkdtempSync(join(tmpdir(), "nuvio-p57-test-"));
    try {
      const handler = createNuvioRoutes({ dataDir: dir });

      const { ctx, getResponse } = createMockContext("POST", "/api/nuvio/public/inquiry", {
        name: "Amina Mohammed",
        email: "amina.m@example.com",
        phone: "+254 712 345678",
        country: "Kenya",
        specialty: "Oncology",
        complaint: "Seeking second opinion on breast cancer treatment protocol",
        source: "website",
      });

      await handler(ctx);
      const res = getResponse();
      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.patientId).toBeDefined();
      expect(res.body.isDuplicate).toBe(false);

      // Duplicate detection
      const { ctx: ctxDup, getResponse: getResDup } = createMockContext(
        "POST",
        "/api/nuvio/public/inquiry",
        {
          name: "Amina Mohammed",
          email: "amina.m@example.com",
          phone: "+254 712 345678",
          country: "Kenya",
        },
      );
      await handler(ctxDup);
      const resDup = getResDup();
      expect(resDup.status).toBe(200);
      expect(resDup.body.isDuplicate).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // Phase 5: Meta & Google Lead Ad Webhook
  it("ingests Meta and Google ad leads via POST /api/nuvio/webhooks/leads", async () => {
    const dir = mkdtempSync(join(tmpdir(), "nuvio-p57-test-"));
    try {
      const handler = createNuvioRoutes({ dataDir: dir });

      // Meta Lead Ad
      const { ctx: ctxMeta, getResponse: getResMeta } = createMockContext(
        "POST",
        "/api/nuvio/webhooks/leads",
        {
          full_name: "Fatima Al-Sayed",
          phone_number: "+968 9988 7766",
          email: "fatima@example.com",
          country: "Oman",
          specialty: "IVF & Fertility",
          ad_source: "meta_ads",
          complaint: "Inquiry from Instagram IVF campaign",
        },
      );
      await handler(ctxMeta);
      const resMeta = getResMeta();
      expect(resMeta.status).toBe(200);
      expect(resMeta.body.ok).toBe(true);
      expect(resMeta.body.leadCaptured).toBe(true);

      // Google Lead Ad
      const { ctx: ctxGoogle, getResponse: getResGoogle } = createMockContext(
        "POST",
        "/api/nuvio/webhooks/leads",
        {
          name: "Daniel Mwangi",
          phone: "+254 700 112233",
          country: "Kenya",
          treatment: "Cardiology & Cardiac Surgery",
          source: "google_ads",
          complaint: "Coronary bypass search ad lead",
        },
      );
      await handler(ctxGoogle);
      const resGoogle = getResGoogle();
      expect(resGoogle.status).toBe(200);
      expect(resGoogle.body.ok).toBe(true);
      expect(resGoogle.body.leadCaptured).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // Phase 6: WhatsApp Cloud API Webhook
  it("verifies webhook challenge and routes incoming WhatsApp messages", async () => {
    const dir = mkdtempSync(join(tmpdir(), "nuvio-p57-test-"));
    try {
      const handler = createNuvioRoutes({ dataDir: dir });

      // Verification challenge GET
      const { ctx: ctxGet, getResponse: getResGet } = createMockContext(
        "GET",
        "/api/nuvio/webhooks/whatsapp",
        null,
        { "hub.mode": "subscribe", "hub.challenge": "test_challenge_token_12345" },
      );
      await handler(ctxGet);
      const resGet = getResGet();
      expect(resGet.status).toBe(200);
      expect(resGet.text).toBe("test_challenge_token_12345");

      // Incoming message POST
      const { ctx: ctxPost, getResponse: getResPost } = createMockContext(
        "POST",
        "/api/nuvio/webhooks/whatsapp",
        {
          from: "+968 9123 9999",
          name: "Salim Al-Harthy",
          message: "Hello, I want to know about knee replacement surgery in India.",
          country: "Oman",
        },
      );
      await handler(ctxPost);
      const resPost = getResPost();
      expect(resPost.status).toBe(200);
      expect(resPost.body.ok).toBe(true);
      expect(resPost.body.patientId).toBeDefined();
      expect(typeof resPost.body.reply).toBe("string");
      expect((resPost.body.reply as string).length).toBeGreaterThan(0);

      // Outbound dispatch POST /api/nuvio/whatsapp/send
      const { ctx: ctxSend, getResponse: getResSend } = createMockContext(
        "POST",
        "/api/nuvio/whatsapp/send",
        {
          patientId: resPost.body.patientId,
          message: "We have reviewed your inquiry and our coordinator is scheduling your consultation.",
        },
      );
      await handler(ctxSend);
      const resSend = getResSend();
      expect(resSend.status).toBe(200);
      expect(resSend.body.ok).toBe(true);
      expect(resSend.body.status).toBe("delivered");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // Phase 7: Voice Agent Endpoints
  it("handles voice call incoming greeting and voice call summary ingestion", async () => {
    const dir = mkdtempSync(join(tmpdir(), "nuvio-p57-test-"));
    try {
      const store = new NuvioDossierStore({ dataDir: dir });
      const handler = createNuvioRoutes({ dataDir: dir });

      // Ingest test patient
      const intake = ingestInquiry(store, {
        name: "Ibrahim Kiptoo",
        country: "Kenya",
        phone: "+254 733 445566",
        specialty: "Neurosurgery",
        source: "phone",
      });

      // Incoming voice call greeting
      const { ctx: ctxVoice, getResponse: getResVoice } = createMockContext(
        "POST",
        "/api/nuvio/voice/incoming",
        {},
      );
      await handler(ctxVoice);
      const resVoice = getResVoice();
      expect(resVoice.status).toBe(200);
      expect(resVoice.body.ok).toBe(true);
      expect(resVoice.body.initialGreeting).toBeDefined();
      expect(resVoice.body.action).toBe("stream_bidirectional");

      // Voice call summary & actions
      const { ctx: ctxSum, getResponse: getResSum } = createMockContext(
        "POST",
        "/api/nuvio/voice/summary",
        {
          patientId: intake.dossier.patientId,
          transcript: "Patient called asking if MRI scan from Nairobi hospital is sufficient. Informed him yes, requested upload.",
          summary: "Patient inquired about MRI scan acceptance. Coordinator agreed and promised review within 24h.",
          callDurationSeconds: 145,
          actionItems: ["Review patient's uploaded brain MRI", "Schedule video consult with Chief Neurosurgeon"],
        },
      );
      await handler(ctxSum);
      const resSum = getResSum();
      expect(resSum.status).toBe(200);
      expect(resSum.body.ok).toBe(true);
      const d = resSum.body.dossier as any;
      const voiceEvent = d.timeline.find((t: any) => t.eventType === "voice_call_completed");
      expect(voiceEvent).toBeDefined();
      expect(voiceEvent.note).toContain("145s");

      // Verify task was created for action item
      const tasks = store.listTasks({ patientId: intake.dossier.patientId });
      expect(tasks.some((t) => t.category === "patient_followup")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
