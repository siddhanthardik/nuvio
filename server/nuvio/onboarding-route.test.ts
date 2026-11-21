import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createNuvioRoutes } from "./routes.ts";
import type { RouteContext } from "../routes/table.ts";

function createMockContext(
  method: string,
  path: string,
  bodyData: unknown,
): {
  ctx: RouteContext;
  getResponse: () => { status: number; body: Record<string, unknown> };
} {
  let responseStatus = 200;
  let responseBody: Record<string, unknown> = {};

  const json = (_res: ServerResponse, status: number, data: unknown) => {
    responseStatus = status;
    responseBody = data as Record<string, unknown>;
  };

  const readBody = async () => bodyData;

  const url = new URL(`http://localhost:8799${path}`);

  const ctx = {
    req: {} as IncomingMessage,
    res: {} as ServerResponse,
    url,
    path: url.pathname,
    method,
    auth: {} as RouteContext["auth"],
    json: json as RouteContext["json"],
    readBody: readBody as RouteContext["readBody"],
  };

  return {
    ctx,
    getResponse: () => ({ status: responseStatus, body: responseBody }),
  };
}

describe("Nuvio Onboarding Route & Body Parser", () => {
  it("completes onboarding for Hospital when readBody returns parsed object", async () => {
    const dir = mkdtempSync(join(tmpdir(), "nuvio-onboarding-test-"));
    try {
      const handler = createNuvioRoutes({ dataDir: dir });
      const { ctx, getResponse } = createMockContext("POST", "/api/nuvio/onboarding", {
        organizationType: "hospital",
        organizationName: "Apollo Multispeciality Hospital",
        country: "India",
        operatingLocation: "New Delhi",
        defaultCurrency: "USD",
        communicationStyle: "warm_professional",
      });

      await handler(ctx);
      const res = getResponse();

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.config).toBeDefined();
      const cfg = res.body.config as Record<string, unknown>;
      expect(cfg.organizationType).toBe("hospital");
      expect(cfg.organizationName).toBe("Apollo Multispeciality Hospital");
      expect(cfg.hospitalName).toBe("Apollo Multispeciality Hospital");
      expect(cfg.onboardingCompleted).toBe(true);
      expect(cfg.defaultCurrency).toBe("USD");
      expect(cfg.communicationStyle).toBe("warm_professional");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("completes onboarding for Medical Tourism Company when readBody returns string", async () => {
    const dir = mkdtempSync(join(tmpdir(), "nuvio-onboarding-test-"));
    try {
      const handler = createNuvioRoutes({ dataDir: dir });
      const rawString = JSON.stringify({
        organizationType: "medical_tourism_company",
        organizationName: "MediConnect Global Services",
        country: "Turkey",
        operatingLocation: "Istanbul",
        defaultCurrency: "EUR",
        communicationStyle: "concise_direct",
      });

      const { ctx, getResponse } = createMockContext("POST", "/api/nuvio/onboarding", rawString);
      await handler(ctx);
      const res = getResponse();

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      const cfg = res.body.config as Record<string, unknown>;
      expect(cfg.organizationType).toBe("medical_tourism_company");
      expect(cfg.organizationName).toBe("MediConnect Global Services");
      expect(cfg.onboardingCompleted).toBe(true);
      expect(cfg.defaultCurrency).toBe("EUR");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("completes onboarding for Independent Coordinator", async () => {
    const dir = mkdtempSync(join(tmpdir(), "nuvio-onboarding-test-"));
    try {
      const handler = createNuvioRoutes({ dataDir: dir });
      const { ctx, getResponse } = createMockContext("POST", "/api/nuvio/onboarding", {
        organizationType: "independent_coordinator",
        organizationName: "Dr. Al-Hassan Patient Facilitation",
        country: "United Arab Emirates",
        operatingLocation: "Dubai",
        defaultCurrency: "AED",
        communicationStyle: "clinical_formal",
      });

      await handler(ctx);
      const res = getResponse();

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      const cfg = res.body.config as Record<string, unknown>;
      expect(cfg.organizationType).toBe("independent_coordinator");
      expect(cfg.organizationName).toBe("Dr. Al-Hassan Patient Facilitation");
      expect(cfg.onboardingCompleted).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns human-readable error when organizationName is missing", async () => {
    const dir = mkdtempSync(join(tmpdir(), "nuvio-onboarding-test-"));
    try {
      const handler = createNuvioRoutes({ dataDir: dir });
      const { ctx, getResponse } = createMockContext("POST", "/api/nuvio/onboarding", {
        organizationType: "hospital",
        organizationName: "",
      });

      await handler(ctx);
      const res = getResponse();

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toBe("Organization type and organization name are required for onboarding.");
      // Ensure it never produces [object Object]
      expect(res.body.error).not.toContain("[object Object]");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns human-readable error for malformed string payload", async () => {
    const dir = mkdtempSync(join(tmpdir(), "nuvio-onboarding-test-"));
    try {
      const handler = createNuvioRoutes({ dataDir: dir });
      const { ctx, getResponse } = createMockContext("POST", "/api/nuvio/onboarding", "{ malformed json: }");

      await handler(ctx);
      const res = getResponse();

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toBe("Invalid JSON in request payload");
      expect(res.body.error).not.toContain("[object Object]");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
