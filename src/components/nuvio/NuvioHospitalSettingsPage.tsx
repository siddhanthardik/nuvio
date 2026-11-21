import { useEffect, useState } from "react";
import {
  Building2,
  MapPin,
  Save,
  Check,
  AlertCircle,
  ShieldCheck,
  Workflow,
  MessageSquare,
  Network,
  Webhook,
  Sparkles,
  HeartPulse,
  Bot,
  Copy,
  Plus,
  Trash2,
} from "lucide-react";
import { useStore } from "@/state/store";
import type {
  CommunicationStyle,
  NuvioOrganizationConfig,
  OrganizationType,
  WorkflowCapability,
} from "../../../shared/nuvio/organization-config";

export function NuvioHospitalSettingsPage() {
  const { dispatch } = useStore();
  const [config, setConfig] = useState<NuvioOrganizationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "profile" | "specialties" | "communication" | "workflow" | "webhooks"
  >("profile");

  const [showAddHospitalForm, setShowAddHospitalForm] = useState(false);
  const [newHospitalName, setNewHospitalName] = useState("");
  const [newHospitalCity, setNewHospitalCity] = useState("");
  const [newHospitalCountry, setNewHospitalCountry] = useState("India");
  const [newHospitalAccreditation, setNewHospitalAccreditation] = useState("JCI");

  const handleAddPartnerHospital = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config || !newHospitalName.trim()) return;
    const current = config.partnerHospitals || [];
    const newHospital = {
      id: `hosp_${Date.now().toString(36)}`,
      name: newHospitalName.trim(),
      city: newHospitalCity.trim() || config.operatingLocation || "New Delhi",
      country: newHospitalCountry.trim() || config.country || "India",
      accreditations: newHospitalAccreditation ? [newHospitalAccreditation] : ["JCI"],
      specialties: [],
      isPreferred: current.length === 0,
    };
    setConfig({ ...config, partnerHospitals: [...current, newHospital] });
    setNewHospitalName("");
    setNewHospitalCity("");
    setShowAddHospitalForm(false);
  };

  const handleRemovePartnerHospital = (id: string) => {
    if (!config) return;
    const current = config.partnerHospitals || [];
    setConfig({
      ...config,
      partnerHospitals: current.filter((h) => h.id !== id),
    });
  };

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
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleCapability = (cap: WorkflowCapability) => {
    if (!config) return;
    const current = config.enabledCapabilities || [];
    const next = current.includes(cap) ? current.filter((c) => c !== cap) : [...current, cap];
    setConfig({ ...config, enabledCapabilities: next });
  };

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) {
    return (
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-app text-ink">
        <div className="flex flex-1 items-center justify-center p-8 text-ink-secondary text-sm">
          Loading Hospital & Organization Configuration...
        </div>
      </main>
    );
  }

  if (!config) {
    return (
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-app text-ink">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
          <div className="text-rose-500 font-medium text-sm flex items-center gap-2">
            <AlertCircle size={18} />
            {error || "Unable to load Nuvio configuration."}
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-3.5 py-1.5 text-[12px] bg-accent text-white rounded-md font-medium"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const orgTypeLabel =
    config.organizationType === "hospital"
      ? "Hospital / Healthcare Provider"
      : config.organizationType === "medical_tourism_company"
      ? "Medical Tourism Company"
      : "Independent Medical Coordinator";

  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-app text-ink">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-5 p-6 pb-24 md:pb-6 max-w-5xl mx-auto">
          {/* Top Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border-secondary">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-ink tracking-tight">
                  {config.organizationName || "Hospital & Organization Settings"}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                  <Building2 size={11} />
                  {orgTypeLabel}
                </span>
              </div>
              <div className="flex items-center gap-3 text-ink-secondary text-[12px] mt-1">
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {config.operatingLocation}, {config.country}
                </span>
                <span>•</span>
                <span>Hospital Setup, Safety Guards & Channel Configuration</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => dispatch({ type: "showOperations" })}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md border border-border bg-menu hover:bg-menu-hover text-ink transition-colors"
              >
                <HeartPulse size={13} className="text-accent" />
                Operations
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: "showWorkforce" })}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md border border-border bg-menu hover:bg-menu-hover text-ink transition-colors"
              >
                <Bot size={13} className="text-accent" />
                AI Workforce
              </button>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("nuvio:open-wizard"))}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md bg-accent/10 hover:bg-accent/15 text-accent transition-colors"
              >
                <Sparkles size={13} />
                Launch Wizard
              </button>
            </div>
          </div>

          {/* Settings Section Tabs */}
          <div className="flex flex-wrap gap-1.5 border-b border-border-secondary pb-2">
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
              onClick={() => setActiveTab("specialties")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
                activeTab === "specialties"
                  ? "bg-accent/10 text-accent font-semibold"
                  : "text-ink-secondary hover:text-ink hover:bg-menu-hover"
              }`}
            >
              <Network size={14} />
              Departments & Specialties
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
              Patient Communication & Safeguards
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
              Workflow Automation
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("webhooks")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
                activeTab === "webhooks"
                  ? "bg-accent/10 text-accent font-semibold"
                  : "text-ink-secondary hover:text-ink hover:bg-menu-hover"
              }`}
            >
              <Webhook size={14} />
              Channels & Webhooks
            </button>
          </div>

          {/* TAB 1: Organization Profile */}
          {activeTab === "profile" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-border bg-menu p-5 shadow-xs flex flex-col gap-4">
                <h2 className="text-sm font-semibold text-ink border-b border-border-secondary pb-2.5">
                  General Hospital Details
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-ink mb-1">
                      Organization Classification
                    </label>
                    <select
                      value={config.organizationType}
                      onChange={(e) =>
                        setConfig({ ...config, organizationType: e.target.value as OrganizationType })
                      }
                      className="w-full rounded-md border border-border px-3 py-2 text-[13px] bg-subtle text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="hospital">Hospital / Healthcare Provider</option>
                      <option value="medical_tourism_company">Medical Tourism Company</option>
                      <option value="independent_coordinator">Independent Medical Coordinator</option>
                    </select>
                    <p className="text-[11px] text-ink-secondary mt-1">
                      Adapts patient triage and hospital assignment behavior across AI agents.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-ink mb-1">
                      Official Organization Name
                    </label>
                    <input
                      type="text"
                      value={config.organizationName}
                      onChange={(e) => setConfig({ ...config, organizationName: e.target.value })}
                      className="w-full rounded-md border border-border px-3 py-2 text-[13px] bg-subtle text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <p className="text-[11px] text-ink-secondary mt-1">
                      Displayed to patients in official greetings, quotes, and invitation letters.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-ink mb-1">
                      Operating City / Location
                    </label>
                    <input
                      type="text"
                      value={config.operatingLocation}
                      onChange={(e) => setConfig({ ...config, operatingLocation: e.target.value })}
                      placeholder="e.g. New Delhi, Mumbai, Chennai"
                      className="w-full rounded-md border border-border px-3 py-2 text-[13px] bg-subtle text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-ink mb-1">
                      Destination Country
                    </label>
                    <input
                      type="text"
                      value={config.country}
                      onChange={(e) => setConfig({ ...config, country: e.target.value })}
                      placeholder="e.g. India, Thailand, Turkey"
                      className="w-full rounded-md border border-border px-3 py-2 text-[13px] bg-subtle text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-ink mb-1">
                      Default Package Currency
                    </label>
                    <select
                      value={config.defaultCurrency}
                      onChange={(e) => setConfig({ ...config, defaultCurrency: e.target.value })}
                      className="w-full rounded-md border border-border px-3 py-2 text-[13px] bg-subtle text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="USD">USD ($) — Recommended for International Patients</option>
                      <option value="INR">INR (₹) — Indian Rupee</option>
                      <option value="EUR">EUR (€) — Euro</option>
                      <option value="GBP">GBP (£) — British Pound</option>
                      <option value="AED">AED (د.إ) — UAE Dirham</option>
                      <option value="BDT">BDT (৳) — Bangladeshi Taka</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-ink mb-1">
                      Primary Timezone
                    </label>
                    <input
                      type="text"
                      value={config.timezone || "Asia/Kolkata"}
                      onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
                      className="w-full rounded-md border border-border px-3 py-2 text-[13px] bg-subtle text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Contact & Escalations */}
              <div className="rounded-xl border border-border bg-menu p-5 shadow-xs flex flex-col gap-4">
                <h2 className="text-sm font-semibold text-ink border-b border-border-secondary pb-2.5">
                  Patient Helplines & Escalation Contacts
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-ink mb-1">
                      Official WhatsApp Helpline
                    </label>
                    <input
                      type="tel"
                      value={config.contactWhatsApp || ""}
                      onChange={(e) => setConfig({ ...config, contactWhatsApp: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-md border border-border px-3 py-2 text-[13px] bg-subtle text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <p className="text-[11px] text-ink-secondary mt-1">
                      Used for patient WhatsApp automation and outbound notifications.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-ink mb-1">
                      Official Coordinator Email
                    </label>
                    <input
                      type="email"
                      value={config.contactEmail || ""}
                      onChange={(e) => setConfig({ ...config, contactEmail: e.target.value })}
                      placeholder="international@hospital.example"
                      className="w-full rounded-md border border-border px-3 py-2 text-[13px] bg-subtle text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <p className="text-[11px] text-ink-secondary mt-1">
                      Receives urgent patient escalations and human approval requests.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Departments & Specialties */}
          {activeTab === "specialties" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-border bg-menu p-5 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-border-secondary pb-2.5">
                  <div>
                    <h2 className="text-sm font-semibold text-ink">Active Clinical Specialties</h2>
                    <p className="text-[12px] text-ink-secondary mt-0.5">
                      Specialties handled by your coordination workforce and matched with incoming patients.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(config.supportedSpecialties || []).map((spec, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-subtle text-[13px] font-medium text-ink"
                    >
                      <span>{spec}</span>
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/10 text-emerald-600">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Accreditations */}
              <div className="rounded-xl border border-border bg-menu p-5 shadow-xs flex flex-col gap-4">
                <h2 className="text-sm font-semibold text-ink border-b border-border-secondary pb-2.5">
                  Hospital Accreditations & Quality Certifications
                </h2>
                <div className="flex flex-wrap gap-2">
                  {(config.accreditations || ["JCI", "NABH"]).map((acc, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-md bg-accent/10 border border-accent/20 text-accent font-semibold text-[12px] flex items-center gap-1.5"
                    >
                      <ShieldCheck size={14} />
                      {acc} Accredited
                    </span>
                  ))}
                </div>
                <p className="text-[12px] text-ink-secondary">
                  Accreditations are automatically cited in patient welcome dossiers to build trust with international patients.
                </p>
              </div>

              {/* Facility Scope: Single Hospital vs Multi-Hospital Partner Network */}
              {config.organizationType === "hospital" ? (
                <div className="rounded-xl border border-border bg-menu p-5 shadow-xs flex flex-col gap-3">
                  <div className="flex items-center gap-2 border-b border-border-secondary pb-2.5">
                    <Building2 size={16} className="text-accent" />
                    <h2 className="text-sm font-semibold text-ink">
                      Facility Model: Dedicated Single Hospital
                    </h2>
                  </div>
                  <p className="text-[12px] text-ink leading-relaxed">
                    Nuvio is configured as a dedicated AI workforce for <strong>{config.organizationName}</strong>. AI agents exclusively introduce your internal clinical departments and specialist doctors, coordinate in-house consultations, and generate official surgical estimates based on your billing rules. Competing facilities are never suggested.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-menu p-5 shadow-xs flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-border-secondary pb-2.5">
                    <div>
                      <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                        <Building2 size={16} className="text-accent" />
                        Partner Hospital Network ({config.partnerHospitals?.length || 0} Facilities)
                      </h2>
                      <p className="text-[12px] text-ink-secondary mt-0.5">
                        {config.organizationType === "medical_tourism_company"
                          ? "Partner healthcare providers where your company refers international patients for surgery and treatment."
                          : "Accredited hospitals where you refer patients for expert second opinions and medical procedures."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddHospitalForm(!showAddHospitalForm)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold bg-accent text-white rounded-md hover:brightness-110 transition-all shadow-xs"
                    >
                      <Plus size={13} />
                      {showAddHospitalForm ? "Close Form" : "Add Partner Hospital"}
                    </button>
                  </div>

                  {showAddHospitalForm && (
                    <form
                      onSubmit={handleAddPartnerHospital}
                      className="p-4 rounded-lg border border-accent/20 bg-accent/5 flex flex-col gap-3"
                    >
                      <div className="text-[12px] font-semibold text-ink">
                        Register New Partner Hospital
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-ink mb-1">
                            Hospital Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Apollo Hospitals, Fortis Memorial"
                            value={newHospitalName}
                            onChange={(e) => setNewHospitalName(e.target.value)}
                            className="w-full rounded-md border border-border px-2.5 py-1.5 text-[12px] bg-menu text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-ink mb-1">
                            City / Location
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. New Delhi, Gurgaon, Istanbul"
                            value={newHospitalCity}
                            onChange={(e) => setNewHospitalCity(e.target.value)}
                            className="w-full rounded-md border border-border px-2.5 py-1.5 text-[12px] bg-menu text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-ink mb-1">
                            Country
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. India, Turkey, Thailand"
                            value={newHospitalCountry}
                            onChange={(e) => setNewHospitalCountry(e.target.value)}
                            className="w-full rounded-md border border-border px-2.5 py-1.5 text-[12px] bg-menu text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-ink mb-1">
                            Accreditation
                          </label>
                          <select
                            value={newHospitalAccreditation}
                            onChange={(e) => setNewHospitalAccreditation(e.target.value)}
                            className="w-full rounded-md border border-border px-2.5 py-1.5 text-[12px] bg-menu text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                          >
                            <option value="JCI">JCI Accredited</option>
                            <option value="NABH">NABH Accredited</option>
                            <option value="ISO">ISO Certified</option>
                            <option value="JCI, NABH">Both JCI & NABH</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddHospitalForm(false)}
                          className="px-3 py-1 text-[11px] border border-border rounded text-ink"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3.5 py-1 text-[11px] font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700"
                        >
                          Save Partner Hospital
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="flex flex-col gap-2">
                    {(!config.partnerHospitals || config.partnerHospitals.length === 0) ? (
                      <div className="text-[12px] text-ink-secondary p-4 text-center border border-dashed border-border rounded-lg bg-subtle">
                        No partner hospitals registered yet. Click &quot;Add Partner Hospital&quot; above to add your accredited hospital facilities.
                      </div>
                    ) : (
                      config.partnerHospitals.map((hosp) => (
                        <div
                          key={hosp.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-border bg-subtle text-[12px]"
                        >
                          <div>
                            <div className="font-semibold text-ink flex items-center gap-2">
                              <span>{hosp.name}</span>
                              {hosp.accreditations?.map((acc, ai) => (
                                <span
                                  key={ai}
                                  className="px-1.5 py-0.5 text-[10px] font-semibold bg-accent/10 text-accent rounded"
                                >
                                  {acc}
                                </span>
                              ))}
                            </div>
                            <div className="text-ink-secondary text-[11px] mt-0.5">
                              {hosp.city ? `${hosp.city}, ` : ""}{hosp.country}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemovePartnerHospital(hosp.id)}
                            className="p-1.5 text-ink-secondary hover:text-rose-500 rounded hover:bg-rose-500/10 transition-colors"
                            title="Remove hospital"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Patient Communication & Safeguards */}
          {activeTab === "communication" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-border bg-menu p-5 shadow-xs flex flex-col gap-4">
                <h2 className="text-sm font-semibold text-ink border-b border-border-secondary pb-2.5">
                  Patient Communication Tone & Pacing
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-ink mb-1">
                      Communication Style
                    </label>
                    <select
                      value={config.communicationStyle}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          communicationStyle: e.target.value as CommunicationStyle,
                        })
                      }
                      className="w-full rounded-md border border-border px-3 py-2 text-[13px] bg-subtle text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="warm_professional">Warm & Professional (Empathetic, clear, conversational)</option>
                      <option value="concise_direct">Concise & Direct (Brief, bulleted, action-focused)</option>
                      <option value="clinical_formal">Clinical & Formal (Institutional hospital terminology)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-ink mb-1">
                      Maximum Sentences Per AI Response
                    </label>
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
                      className="w-full rounded-md border border-border px-3 py-2 text-[13px] bg-subtle text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="1">1 sentence (Ultra-concise)</option>
                      <option value="2">2 sentences</option>
                      <option value="3">3 sentences (Default standard for messaging)</option>
                      <option value="4">4 sentences</option>
                    </select>
                    <p className="text-[11px] text-ink-secondary mt-1">
                      Enforces natural conversational cadence on WhatsApp and prevents overwhelming patients with walls of text.
                    </p>
                  </div>
                </div>
              </div>

              {/* Mandatory Human Approval Gates */}
              <div className="rounded-xl border border-border bg-menu p-5 shadow-xs flex flex-col gap-4">
                <h2 className="text-sm font-semibold text-ink border-b border-border-secondary pb-2.5 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  Mandatory Human Coordinator Approval Gates
                </h2>

                <div className="flex flex-col gap-3">
                  <label className="flex items-start gap-3 p-3.5 rounded-lg border border-border bg-subtle cursor-pointer hover:bg-menu-hover/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={config.safetyGuards.requireHumanApprovalForEstimates}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          safetyGuards: {
                            ...config.safetyGuards,
                            requireHumanApprovalForEstimates: e.target.checked,
                          },
                        })
                      }
                      className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent"
                    />
                    <div>
                      <div className="text-[13px] font-semibold text-ink">
                        Require Coordinator Sign-Off for Surgical & Treatment Quotes
                      </div>
                      <div className="text-[12px] text-ink-secondary mt-0.5">
                        Prevents tentative quotes and cost estimates prepared by Pramesh (Estimator Agent) from being released to the patient until formally approved by a human coordinator.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3.5 rounded-lg border border-border bg-subtle cursor-pointer hover:bg-menu-hover/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={config.safetyGuards.requireHumanApprovalForVisaLetters}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          safetyGuards: {
                            ...config.safetyGuards,
                            requireHumanApprovalForVisaLetters: e.target.checked,
                          },
                        })
                      }
                      className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent"
                    />
                    <div>
                      <div className="text-[13px] font-semibold text-ink">
                        Require Coordinator Sign-Off for Medical Visa Invitation Letters
                      </div>
                      <div className="text-[12px] text-ink-secondary mt-0.5">
                        Requires coordinator review and hospital seal authorization before issuing visa assistance letters to the patient and embassy.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Workflow Automation */}
          {activeTab === "workflow" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-border bg-menu p-5 shadow-xs flex flex-col gap-4">
                <h2 className="text-sm font-semibold text-ink border-b border-border-secondary pb-2.5">
                  Automated Journey Capabilities
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    {
                      id: "lead_qualification" as const,
                      title: "Lead Qualification & Scoring",
                      desc: "Scores urgency, intent, and flags red flags immediately on intake.",
                    },
                    {
                      id: "document_collection" as const,
                      title: "Medical Document Tracking",
                      desc: "Requests missing diagnostic reports and tracks clinician review status.",
                    },
                    {
                      id: "consultation_coordination" as const,
                      title: "Doctor Consultation Scheduling",
                      desc: "Coordinates specialist slots for video calls and second opinions.",
                    },
                    {
                      id: "estimate_coordination" as const,
                      title: "Treatment Package Formulation",
                      desc: "Coordinates multi-currency pricing ranges with hospital billing.",
                    },
                    {
                      id: "visa_travel_coordination" as const,
                      title: "Visa & Travel Logistics",
                      desc: "Coordinates visa invitation letters, flights, and airport transfers.",
                    },
                    {
                      id: "post_treatment_followup" as const,
                      title: "Post-Treatment Follow-up",
                      desc: "Automates recovery check-ins, medication adherence, and follow-up reviews.",
                    },
                  ].map((cap) => {
                    const enabled = config.enabledCapabilities.includes(cap.id);
                    return (
                      <div
                        key={cap.id}
                        onClick={() => toggleCapability(cap.id)}
                        className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                          enabled
                            ? "border-accent/30 bg-accent/5"
                            : "border-border bg-subtle opacity-75"
                        }`}
                      >
                        <div>
                          <div className="text-[13px] font-semibold text-ink">{cap.title}</div>
                          <div className="text-[12px] text-ink-secondary mt-0.5">{cap.desc}</div>
                        </div>
                        <span
                          className={`shrink-0 px-2 py-0.5 text-[11px] font-semibold rounded ${
                            enabled
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-ink-secondary/15 text-ink-secondary"
                          }`}
                        >
                          {enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Channels & Webhooks */}
          {activeTab === "webhooks" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-border bg-menu p-5 shadow-xs flex flex-col gap-4">
                <div className="border-b border-border-secondary pb-2.5">
                  <h2 className="text-sm font-semibold text-ink">Channel & Webhook Endpoints</h2>
                  <p className="text-[12px] text-ink-secondary mt-0.5">
                    Live production endpoints configured for marketing leads, WhatsApp, and voice intake.
                  </p>
                </div>

                <div className="flex flex-col gap-3.5">
                  {/* Public Lead Intake */}
                  <div className="p-3.5 rounded-lg border border-border bg-subtle flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-mono text-[10px] font-bold">
                          POST
                        </span>
                        Public Website Lead Intake Form
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard("inquiry", "/api/nuvio/public/inquiry")}
                        className="flex items-center gap-1 text-[11px] text-accent hover:underline font-medium"
                      >
                        <Copy size={12} />
                        {copiedKey === "inquiry" ? "Copied!" : "Copy Path"}
                      </button>
                    </div>
                    <code className="text-[11px] font-mono bg-menu border border-border/80 px-2.5 py-1.5 rounded text-ink break-all">
                      POST /api/nuvio/public/inquiry
                    </code>
                    <p className="text-[11px] text-ink-secondary">
                      Accepts name, country, phone, email, and chief complaint directly from hospital website contact forms. Auto-deduplicates inquiries.
                    </p>
                  </div>

                  {/* Meta / Google Lead Webhook */}
                  <div className="p-3.5 rounded-lg border border-border bg-subtle flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-mono text-[10px] font-bold">
                          POST
                        </span>
                        Meta & Google Ad Leads Webhook
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard("leads", "/api/nuvio/webhooks/leads")}
                        className="flex items-center gap-1 text-[11px] text-accent hover:underline font-medium"
                      >
                        <Copy size={12} />
                        {copiedKey === "leads" ? "Copied!" : "Copy Path"}
                      </button>
                    </div>
                    <code className="text-[11px] font-mono bg-menu border border-border/80 px-2.5 py-1.5 rounded text-ink break-all">
                      POST /api/nuvio/webhooks/leads
                    </code>
                    <p className="text-[11px] text-ink-secondary">
                      Native adapter for Facebook/Instagram Instant Forms and Google Lead Ad payloads. Automatically triggers Kavita (Lead Qualifier) and welcomes the lead.
                    </p>
                  </div>

                  {/* WhatsApp Cloud API Webhook */}
                  <div className="p-3.5 rounded-lg border border-border bg-subtle flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-mono text-[10px] font-bold">
                          GET / POST
                        </span>
                        WhatsApp Cloud API Webhook
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard("whatsapp", "/api/nuvio/webhooks/whatsapp")}
                        className="flex items-center gap-1 text-[11px] text-accent hover:underline font-medium"
                      >
                        <Copy size={12} />
                        {copiedKey === "whatsapp" ? "Copied!" : "Copy Path"}
                      </button>
                    </div>
                    <code className="text-[11px] font-mono bg-menu border border-border/80 px-2.5 py-1.5 rounded text-ink break-all">
                      GET & POST /api/nuvio/webhooks/whatsapp
                    </code>
                    <p className="text-[11px] text-ink-secondary">
                      Handles Meta webhook verification challenge and routes bidirectional patient chats directly through Siddhant (Patient Concierge).
                    </p>
                  </div>

                  {/* Voice Calling Ingestion */}
                  <div className="p-3.5 rounded-lg border border-border bg-subtle flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 font-mono text-[10px] font-bold">
                          POST
                        </span>
                        Voice Calling Agent Stream & Summary
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard("voice", "/api/nuvio/voice/incoming")}
                        className="flex items-center gap-1 text-[11px] text-accent hover:underline font-medium"
                      >
                        <Copy size={12} />
                        {copiedKey === "voice" ? "Copied!" : "Copy Path"}
                      </button>
                    </div>
                    <code className="text-[11px] font-mono bg-menu border border-border/80 px-2.5 py-1.5 rounded text-ink break-all">
                      POST /api/nuvio/voice/incoming & POST /api/nuvio/voice/summary
                    </code>
                    <p className="text-[11px] text-ink-secondary">
                      Feeds inbound call greetings for Vikram (Voice Agent) and ingests transcribed call summaries directly into the patient's dossier timeline.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sticky Bottom Save Actions Bar */}
          <div className="rounded-xl border border-border bg-menu p-4 shadow-md flex items-center justify-between">
            <div>
              {error && (
                <div className="flex items-center gap-1.5 text-rose-500 text-[12px] font-medium">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}
              {savedSuccess && (
                <div className="flex items-center gap-1.5 text-emerald-600 text-[12px] font-medium">
                  <Check size={14} />
                  Hospital configuration saved and active across all AI agents!
                </div>
              )}
              {!error && !savedSuccess && (
                <div className="text-[12px] text-ink-secondary">
                  Settings changes are applied immediately to all patient workflows and AI agents.
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 text-white rounded-md text-[13px] font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-xs"
            >
              <Save size={14} />
              {saving ? "Saving Changes..." : "Save Hospital Settings"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
