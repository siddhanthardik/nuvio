import { useEffect, useState } from "react";
import { Check, Building2, MessageSquare, Workflow, Save, AlertCircle, Sparkles, HeartPulse, LayoutDashboard } from "lucide-react";
import { Card, SettingRow, SettingsGroup, SettingsRows, Switch } from "../SettingsPrimitives";
import { useStore } from "@/state/store";
import type {
  CommunicationStyle,
  NuvioOrganizationConfig,
  OrganizationType,
  WorkflowCapability,
} from "../../../shared/nuvio/organization-config";

export function NuvioSettingsSection() {
  const { dispatch } = useStore();
  const [config, setConfig] = useState<NuvioOrganizationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "communication" | "workflow">("profile");

  useEffect(() => {
    let alive = true;
    fetch("/api/nuvio/organization")
      .then((res) => res.json())
      .then((data) => {
        if (alive && data.ok && data.config) {
          setConfig(data.config);
        }
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : "Failed to load settings");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/nuvio/organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to save configuration");
      }
      setConfig(data.config);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SettingsGroup label="Nuvio Medical Tourism Platform" block="nuvio-loading">
        <Card>
          <div className="p-4 text-ink-secondary text-[13px]">Loading Nuvio configuration...</div>
        </Card>
      </SettingsGroup>
    );
  }

  if (!config) {
    return (
      <SettingsGroup label="Nuvio Medical Tourism Platform" block="nuvio-error">
        <Card>
          <div className="p-4 text-red-500 text-[13px]">{error || "Unable to reach Nuvio configuration."}</div>
        </Card>
      </SettingsGroup>
    );
  }

  const toggleCapability = (cap: WorkflowCapability) => {
    const current = config.enabledCapabilities || [];
    const next = current.includes(cap) ? current.filter((c) => c !== cap) : [...current, cap];
    setConfig({ ...config, enabledCapabilities: next });
  };

  return (
    <SettingsGroup label="Nuvio Medical Tourism Platform" block="nuvio-settings">
      <div className="flex flex-col gap-3">
        {/* Quick Launch & Status Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-accent/5 border border-accent/20">
          <div>
            <div className="text-[14px] font-semibold text-ink flex items-center gap-1.5">
              <span>{config.organizationName || "Nuvio Organization Setup"}</span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent/15 text-accent">
                {config.organizationType.replace(/_/g, " ")}
              </span>
            </div>
            <div className="text-[12px] text-ink-secondary mt-0.5">
              Configure hospital credentials, clinical coordinators, and patient journey capabilities.
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "toggleAppSettings", open: false });
                dispatch({ type: "showOperations" });
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium rounded-lg bg-raised hover:bg-raised/80 text-ink border border-hairline transition-colors"
            >
              <HeartPulse size={13} className="text-accent" />
              Operations
            </button>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "toggleAppSettings", open: false });
                dispatch({ type: "showDashboard" });
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium rounded-lg bg-raised hover:bg-raised/80 text-ink border border-hairline transition-colors"
            >
              <LayoutDashboard size={13} className="text-accent" />
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("nuvio:open-wizard"))}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium rounded-lg bg-accent text-white hover:brightness-110 transition-colors shadow-xs"
            >
              <Sparkles size={13} />
              Setup Wizard
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-border-secondary pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
              activeTab === "profile"
                ? "bg-accent/10 text-accent font-semibold"
                : "text-ink-secondary hover:text-ink hover:bg-menu-hover"
            }`}
          >
            <Building2 size={14} />
            Organization Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("communication")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
              activeTab === "communication"
                ? "bg-accent/10 text-accent font-semibold"
                : "text-ink-secondary hover:text-ink hover:bg-menu-hover"
            }`}
          >
            <MessageSquare size={14} />
            Patient Communication
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("workflow")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
              activeTab === "workflow"
                ? "bg-accent/10 text-accent font-semibold"
                : "text-ink-secondary hover:text-ink hover:bg-menu-hover"
            }`}
          >
            <Workflow size={14} />
            Workflow Configuration
          </button>
        </div>

        {/* Tab 1: Organization Profile */}
        {activeTab === "profile" && (
          <SettingsRows>
            <SettingRow
              title="Who will Nuvio work for?"
              subtitle="Adapts patient intake, hospital matching, and clinical workflow behavior"
            >
              <select
                value={config.organizationType}
                onChange={(e) => setConfig({ ...config, organizationType: e.target.value as OrganizationType })}
                className="rounded-md border border-border px-2.5 py-1 text-[13px] bg-menu text-ink focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="hospital">Hospital / Healthcare Provider</option>
                <option value="medical_tourism_company">Medical Tourism Company</option>
                <option value="independent_coordinator">Independent Medical Coordinator</option>
              </select>
            </SettingRow>

            <SettingRow title="Organization Name" subtitle="Displayed to patients in greetings and official paperwork">
              <input
                type="text"
                value={config.organizationName}
                onChange={(e) => setConfig({ ...config, organizationName: e.target.value })}
                className="w-64 rounded-md border border-border px-2.5 py-1 text-[13px] bg-menu text-ink focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </SettingRow>

            <SettingRow title="Country & Location" subtitle="Primary operating city and destination country">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Location / City"
                  value={config.operatingLocation}
                  onChange={(e) => setConfig({ ...config, operatingLocation: e.target.value })}
                  className="w-32 rounded-md border border-border px-2.5 py-1 text-[13px] bg-menu text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <input
                  type="text"
                  placeholder="Country"
                  value={config.country}
                  onChange={(e) => setConfig({ ...config, country: e.target.value })}
                  className="w-32 rounded-md border border-border px-2.5 py-1 text-[13px] bg-menu text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </SettingRow>

            <SettingRow title="Primary Contacts" subtitle="Patient inquiry channels and escalation contact">
              <div className="flex flex-col gap-1.5 w-64">
                <input
                  type="text"
                  placeholder="WhatsApp Number (e.g. +91 98765 43210)"
                  value={config.contactWhatsApp || ""}
                  onChange={(e) => setConfig({ ...config, contactWhatsApp: e.target.value })}
                  className="rounded-md border border-border px-2.5 py-1 text-[12px] bg-menu text-ink"
                />
                <input
                  type="email"
                  placeholder="Official Email Address"
                  value={config.contactEmail || ""}
                  onChange={(e) => setConfig({ ...config, contactEmail: e.target.value })}
                  className="rounded-md border border-border px-2.5 py-1 text-[12px] bg-menu text-ink"
                />
              </div>
            </SettingRow>

            <SettingRow title="Default Operating Currency" subtitle="Base currency for package and procedure estimates">
              <select
                value={config.defaultCurrency}
                onChange={(e) => setConfig({ ...config, defaultCurrency: e.target.value })}
                className="rounded-md border border-border px-2.5 py-1 text-[13px] bg-menu text-ink"
              >
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AED">AED (د.إ)</option>
                <option value="BDT">BDT (৳)</option>
              </select>
            </SettingRow>
          </SettingsRows>
        )}

        {/* Tab 2: Patient Communication */}
        {activeTab === "communication" && (
          <SettingsRows>
            <SettingRow
              title="Patient Communication Style"
              subtitle="Default tone used across all patient-facing messages"
            >
              <select
                value={config.communicationStyle}
                onChange={(e) => setConfig({ ...config, communicationStyle: e.target.value as CommunicationStyle })}
                className="rounded-md border border-border px-2.5 py-1 text-[13px] bg-menu text-ink"
              >
                <option value="warm_professional">Warm & Professional (Recommended)</option>
                <option value="concise_direct">Concise & Direct</option>
                <option value="clinical_formal">Clinical & Formal</option>
              </select>
            </SettingRow>

            <SettingRow
              title="Concierge Agent Name"
              subtitle="Patient-facing intake and qualification coordinator"
            >
              <input
                type="text"
                value={config.agents.nuvio_concierge.displayName}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    agents: {
                      ...config.agents,
                      nuvio_concierge: { ...config.agents.nuvio_concierge, displayName: e.target.value },
                    },
                  })
                }
                className="w-48 rounded-md border border-border px-2.5 py-1 text-[13px] bg-menu text-ink"
              />
            </SettingRow>

            <SettingRow
              title="Clinical Coordinator Name"
              subtitle="Reviews medical reports and matches hospital consultants"
            >
              <input
                type="text"
                value={config.agents.nuvio_clinical.displayName}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    agents: {
                      ...config.agents,
                      nuvio_clinical: { ...config.agents.nuvio_clinical, displayName: e.target.value },
                    },
                  })
                }
                className="w-48 rounded-md border border-border px-2.5 py-1 text-[13px] bg-menu text-ink"
              />
            </SettingRow>

            <SettingRow
              title="Cost Estimator Name"
              subtitle="Coordinates procedure pricing and inclusions"
            >
              <input
                type="text"
                value={config.agents.nuvio_estimator.displayName}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    agents: {
                      ...config.agents,
                      nuvio_estimator: { ...config.agents.nuvio_estimator, displayName: e.target.value },
                    },
                  })
                }
                className="w-48 rounded-md border border-border px-2.5 py-1 text-[13px] bg-menu text-ink"
              />
            </SettingRow>

            <SettingRow
              title="Visa & Travel Specialist Name"
              subtitle="Assists with medical visas, airport transfers, and lodging"
            >
              <input
                type="text"
                value={config.agents.nuvio_travel.displayName}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    agents: {
                      ...config.agents,
                      nuvio_travel: { ...config.agents.nuvio_travel, displayName: e.target.value },
                    },
                  })
                }
                className="w-48 rounded-md border border-border px-2.5 py-1 text-[13px] bg-menu text-ink"
              />
            </SettingRow>

            <SettingRow
              title="Maximum Sentences Per Response"
              subtitle="Enforces natural, conversational pacing (1–3 short sentences)"
            >
              <select
                value={config.safetyGuards.maxSentencesPerMessage || 3}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    safetyGuards: {
                      ...config.safetyGuards,
                      maxSentencesPerMessage: Number(e.target.value),
                    },
                  })
                }
                className="rounded-md border border-border px-2.5 py-1 text-[13px] bg-menu text-ink"
              >
                <option value="1">1 sentence (Very brief)</option>
                <option value="2">2 sentences</option>
                <option value="3">3 sentences (Default standard)</option>
                <option value="4">4 sentences</option>
              </select>
            </SettingRow>
          </SettingsRows>
        )}

        {/* Tab 3: Workflow Configuration */}
        {activeTab === "workflow" && (
          <SettingsRows>
            <SettingRow
              title="Lead Qualification & Intake"
              subtitle="Captures incoming international patient inquiries and flags red flags"
            >
              <Switch
                checked={config.enabledCapabilities.includes("lead_qualification")}
                onClick={() => toggleCapability("lead_qualification")}
              />
            </SettingRow>

            <SettingRow
              title="Medical Document Collection"
              subtitle="Tracks requested, received, and clinician-verified diagnostic reports"
            >
              <Switch
                checked={config.enabledCapabilities.includes("document_collection")}
                onClick={() => toggleCapability("document_collection")}
              />
            </SettingRow>

            <SettingRow
              title="Doctor Consultation Coordination"
              subtitle="Manages video, telephonic, and in-person specialist appointment requests"
            >
              <Switch
                checked={config.enabledCapabilities.includes("consultation_coordination")}
                onClick={() => toggleCapability("consultation_coordination")}
              />
            </SettingRow>

            <SettingRow
              title="Treatment Estimate Coordination"
              subtitle="Generates itemized surgery and hospital stay price ranges"
            >
              <Switch
                checked={config.enabledCapabilities.includes("estimate_coordination")}
                onClick={() => toggleCapability("estimate_coordination")}
              />
            </SettingRow>

            <SettingRow
              title="Medical Visa & Travel Logistics"
              subtitle="Coordinates invitation letters, flight itineraries, and airport pickups"
            >
              <Switch
                checked={config.enabledCapabilities.includes("visa_travel_coordination")}
                onClick={() => toggleCapability("visa_travel_coordination")}
              />
            </SettingRow>

            <SettingRow
              title="Require Human Approval for Cost Estimates"
              subtitle="Prevents tentative quotes from being shared until signed off by hospital coordinator"
            >
              <Switch
                checked={config.safetyGuards.requireHumanApprovalForEstimates}
                onClick={() =>
                  setConfig({
                    ...config,
                    safetyGuards: {
                      ...config.safetyGuards,
                      requireHumanApprovalForEstimates: !config.safetyGuards.requireHumanApprovalForEstimates,
                    },
                  })
                }
              />
            </SettingRow>

            <SettingRow
              title="Require Human Approval for Visa Letters"
              subtitle="Requires coordinator sign-off before generating official hospital visa invitation"
            >
              <Switch
                checked={config.safetyGuards.requireHumanApprovalForVisaLetters}
                onClick={() =>
                  setConfig({
                    ...config,
                    safetyGuards: {
                      ...config.safetyGuards,
                      requireHumanApprovalForVisaLetters: !config.safetyGuards.requireHumanApprovalForVisaLetters,
                    },
                  })
                }
              />
            </SettingRow>
          </SettingsRows>
        )}

        {/* Footer Save Actions */}
        <div className="flex items-center justify-between pt-2">
          {error && (
            <div className="flex items-center gap-1.5 text-red-500 text-[12px]">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-green-600 text-[12px] font-medium">
              <Check size={14} />
              Organization settings saved successfully!
            </div>
          )}
          {!error && !savedSuccess && <div />}

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-md text-[13px] font-medium hover:brightness-110 disabled:opacity-50 transition-all shadow-sm"
          >
            <Save size={14} />
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>
    </SettingsGroup>
  );
}
