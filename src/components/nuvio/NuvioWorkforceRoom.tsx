import { useEffect, useState } from "react";
import {
  Users,
  Bot,
  UserCheck,
  Stethoscope,
  Calendar,
  Calculator,
  Plane,
  Clock,
  PhoneCall,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Settings,
  Sparkles,
  RefreshCw,
  Search,
} from "lucide-react";
import type {
  NuvioAgentRole,
  NuvioOrganizationConfig,
} from "../../../shared/nuvio/organization-config";
import type { CoordinatorTask } from "../../../shared/nuvio/patient-operations";

interface AgentDisplayMeta {
  key: keyof NuvioOrganizationConfig["agents"];
  icon: typeof Bot;
  category: "Patient-Facing" | "Clinical & Operations" | "Financial & Logistics" | "Telephony";
  color: string;
  defaultRoleName: string;
  defaultRoleTitle: string;
  description: string;
  defaultInstructions: string;
  governance: string;
}

const AGENTS_METADATA: AgentDisplayMeta[] = [
  {
    key: "nuvio_concierge",
    icon: Bot,
    category: "Patient-Facing",
    color: "from-blue-600 to-indigo-600",
    defaultRoleName: "Siddhant",
    defaultRoleTitle: "Patient Concierge",
    description:
      "First touchpoint for international patients. Welcomes incoming leads, qualifies intent, and maintains empathetic 1-3 sentence conversational pacing.",
    defaultInstructions: "Provide warm, natural, empathetic 1-3 sentence guidance. Ask one question at a time.",
    governance: "Strict non-diagnostic boundaries; never prescribes or gives medical advice.",
  },
  {
    key: "nuvio_lead_qualifier",
    icon: UserCheck,
    category: "Patient-Facing",
    color: "from-cyan-600 to-blue-600",
    defaultRoleName: "Kavita",
    defaultRoleTitle: "Lead Qualification Agent",
    description:
      "Evaluates inquiry urgency, clinical readiness, budget suitability, and destination preferences to prioritize hospital coordinator outreach.",
    defaultInstructions: "Score urgency, evaluate patient intent, verify destination preferences and budget fit.",
    governance: "Categorizes urgency into High, Medium, Low for triage.",
  },
  {
    key: "nuvio_journey_coordinator",
    icon: Sparkles,
    category: "Clinical & Operations",
    color: "from-purple-600 to-pink-600",
    defaultRoleName: "Rohan",
    defaultRoleTitle: "Patient Journey Coordinator",
    description:
      "Maintains overall trajectory across the 9 patient journey stages, detects stalled leads, and automatically dispatches tasks to specialist agents.",
    defaultInstructions: "Track patient stage progression, identify journey blockers, and dispatch specialist tasks.",
    governance: "Enforces stage transition checkpoints and timeline event recording.",
  },
  {
    key: "nuvio_clinical",
    icon: Stethoscope,
    category: "Clinical & Operations",
    color: "from-emerald-600 to-teal-600",
    defaultRoleName: "Dr. Aarti",
    defaultRoleTitle: "Medical Records Coordinator",
    description:
      "Requests diagnostic reports (DICOM, MRIs, biopsy, pathology), validates document completeness, and summarizes clinical history for doctors.",
    defaultInstructions: "Coordinate medical reports and summarize clinical history. Never diagnose directly.",
    governance: "Strictly non-diagnostic; presents reports to human doctors for review.",
  },
  {
    key: "nuvio_consultation",
    icon: Calendar,
    category: "Clinical & Operations",
    color: "from-amber-600 to-orange-600",
    defaultRoleName: "Ananya",
    defaultRoleTitle: "Consultation Coordinator",
    description:
      "Matches patient needs with relevant hospital departments and consultants, schedules teleconsultations, and gathers pre-consult questions.",
    defaultInstructions: "Coordinate doctor availability, organize teleconsultations, and verify patient questions.",
    governance: "Doctor availability and final scheduling require human coordinator confirmation.",
  },
  {
    key: "nuvio_estimator",
    icon: Calculator,
    category: "Financial & Logistics",
    color: "from-emerald-600 to-green-600",
    defaultRoleName: "Pramesh",
    defaultRoleTitle: "Treatment Estimate Agent",
    description:
      "Formulates itemized treatment package options, hospital bed categories, estimated length of stay, and multi-currency cost ranges.",
    defaultInstructions: "Formulate realistic multi-currency estimate ranges. Require human approval before sharing final quotes.",
    governance: "MANDATORY APPROVAL GATE: Estimates cannot be sent to patients without coordinator approval.",
  },
  {
    key: "nuvio_travel",
    icon: Plane,
    category: "Financial & Logistics",
    color: "from-sky-600 to-blue-600",
    defaultRoleName: "Mahesh",
    defaultRoleTitle: "Medical Visa & Travel Specialist",
    description:
      "Coordinates medical visa invitation letters, embassy paperwork, flights, airport pickup, companion accommodations, and local transit.",
    defaultInstructions: "Coordinate medical visa paperwork, flight itinerary, airport pickup, and companion lodging.",
    governance: "MANDATORY APPROVAL GATE: Visa invitation letters require verification before dispatch.",
  },
  {
    key: "nuvio_followup",
    icon: Clock,
    category: "Clinical & Operations",
    color: "from-indigo-600 to-violet-600",
    defaultRoleName: "Pooja",
    defaultRoleTitle: "Patient Follow-up Agent",
    description:
      "Executes scheduled follow-up cadences for pending records, dormant inquiries, pre-arrival preparations, and post-discharge recovery milestones.",
    defaultInstructions: "Run personalized check-in cadences, re-engage dormant enquiries, and track recovery milestones.",
    governance: "Automated nurturing stops immediately if patient requests a pause or human coordinator takes over.",
  },
  {
    key: "nuvio_voice",
    icon: PhoneCall,
    category: "Telephony",
    color: "from-rose-600 to-red-600",
    defaultRoleName: "Vikram",
    defaultRoleTitle: "Voice Calling Agent",
    description:
      "Handles conversational inbound and outbound phone inquiries, answers hospital FAQs, verifies patient arrival times, and generates CRM call summaries.",
    defaultInstructions: "Handle inbound and outbound patient phone calls, clarify urgent requests, and log call summaries.",
    governance: "Logs full call recording, transcript, and action items directly to the patient dossier.",
  },
];

export function NuvioWorkforceRoom() {
  const [config, setConfig] = useState<NuvioOrganizationConfig | null>(null);
  const [tasks, setTasks] = useState<CoordinatorTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentDisplayMeta | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const loadWorkforce = async () => {
    setLoading(true);
    try {
      const [orgRes, taskRes] = await Promise.all([
        fetch("/api/nuvio/organization").then((r) => r.json()),
        fetch("/api/nuvio/operations/tasks").then((r) => r.json()),
      ]);

      if (orgRes.ok && orgRes.config) {
        setConfig(orgRes.config);
      }
      if (taskRes.ok && taskRes.tasks) {
        setTasks(taskRes.tasks);
      }
    } catch {
      // Quiet fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkforce();
  }, []);

  const toggleAgent = async (agentKey: keyof NuvioOrganizationConfig["agents"], currentEnabled: boolean) => {
    if (!config) return;
    setUpdatingKey(agentKey);
    setNotice(null);

    const currentAgent = config.agents[agentKey] || {
      id: agentKey,
      displayName: AGENTS_METADATA.find((a) => a.key === agentKey)?.defaultRoleName || "Coordinator",
      title: AGENTS_METADATA.find((a) => a.key === agentKey)?.defaultRoleTitle || "AI Specialist",
      enabled: true,
      customInstructions: "",
    };

    const updatedAgent: NuvioAgentRole = {
      ...currentAgent,
      enabled: !currentEnabled,
    };

    const updatedAgents = {
      ...config.agents,
      [agentKey]: updatedAgent,
    };

    try {
      const res = await fetch("/api/nuvio/organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agents: updatedAgents,
        }),
      });

      const data = await res.json();
      if (data.ok && data.config) {
        setConfig(data.config);
        setNotice(
          `${updatedAgent.displayName} (${updatedAgent.title}) is now ${
            updatedAgent.enabled ? "Active" : "Paused"
          }.`
        );
      }
    } catch {
      setNotice("Failed to update agent status. Please try again.");
    } finally {
      setUpdatingKey(null);
    }
  };

  const filteredAgents = AGENTS_METADATA.filter((agent) => {
    if (categoryFilter !== "all" && agent.category !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const cfgAgent = config?.agents[agent.key];
      const name = (cfgAgent?.displayName || agent.defaultRoleName).toLowerCase();
      const title = (cfgAgent?.title || agent.defaultRoleTitle).toLowerCase();
      const desc = agent.description.toLowerCase();
      return name.includes(q) || title.includes(q) || desc.includes(q);
    }
    return true;
  });

  const getAgentTaskCount = (category: string) => {
    return tasks.filter((t) => t.category === category && t.status === "pending").length;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-app text-ink">
      {/* Top Header */}
      <div className="border-b border-border bg-subtle/50 px-6 py-5 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-white shadow-sm">
                <Users size={20} />
              </span>
              <div>
                <h1 className="text-[18px] font-bold tracking-tight text-ink">
                  AI Patient Coordination Workforce
                </h1>
                <p className="text-[12px] text-ink-secondary">
                  Specialized execution engine managing patient journeys, clinical summaries, estimates, and logistics.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadWorkforce}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-subtle text-ink text-[12px] font-medium hover:bg-menu-hover transition-colors shadow-2xs"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-accent" : "text-ink-secondary"} />
              Refresh Roster
            </button>
          </div>
        </div>

        {/* Notice Banner */}
        {notice && (
          <div className="mt-3 rounded-lg bg-accent/10 border border-accent/20 px-3.5 py-2 text-[12px] text-accent flex items-center justify-between">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(null)} className="text-accent hover:opacity-75 font-semibold text-[11px]">
              Dismiss
            </button>
          </div>
        )}

        {/* Filters & Search */}
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["all", "Patient-Facing", "Clinical & Operations", "Financial & Logistics", "Telephony"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors whitespace-nowrap ${
                  categoryFilter === cat
                    ? "bg-accent text-white shadow-2xs"
                    : "bg-subtle text-ink-secondary hover:text-ink hover:bg-menu-hover"
                }`}
              >
                {cat === "all" ? "All 9 Agents" : cat}
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search size={14} className="absolute left-2.5 top-2.5 text-ink-secondary" />
            <input
              type="text"
              placeholder="Filter workforce..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-md border border-border bg-subtle text-[12px] text-ink focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="p-6 pb-24 md:pb-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredAgents.map((meta) => {
          const cfgAgent = config?.agents[meta.key];
          const isEnabled = cfgAgent ? cfgAgent.enabled !== false : true;
          const displayName = cfgAgent?.displayName || meta.defaultRoleName;
          const displayTitle = cfgAgent?.title || meta.defaultRoleTitle;
          const isUpdating = updatingKey === meta.key;
          const IconComponent = meta.icon;

          return (
            <div
              key={meta.key}
              className={`rounded-xl border transition-all duration-200 flex flex-col overflow-hidden bg-menu shadow-xs ${
                isEnabled ? "border-border hover:border-accent/40 hover:shadow-md" : "border-border/60 opacity-60 bg-subtle/30"
              }`}
            >
              {/* Card Header */}
              <div className="p-4 border-b border-border/50 flex items-start justify-between gap-3 bg-subtle/20">
                <div className="flex items-center gap-3">
                  <div
                    className={`size-11 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-white shadow-sm shrink-0`}
                  >
                    <IconComponent size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[14px] text-ink">{displayName}</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-subtle border border-border text-ink-secondary">
                        {meta.category}
                      </span>
                    </div>
                    <div className="text-[12px] font-medium text-accent mt-0.5">{displayTitle}</div>
                  </div>
                </div>

                {/* Enable/Disable Toggle */}
                <button
                  type="button"
                  title={isEnabled ? "Pause Agent" : "Activate Agent"}
                  disabled={isUpdating}
                  onClick={() => toggleAgent(meta.key, isEnabled)}
                  className="text-ink-secondary hover:text-accent transition-colors shrink-0 disabled:opacity-50"
                >
                  {isEnabled ? (
                    <ToggleRight size={28} className="text-emerald-500" />
                  ) : (
                    <ToggleLeft size={28} className="text-ink-secondary/50" />
                  )}
                </button>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                <div>
                  <p className="text-[12px] text-ink leading-relaxed">{meta.description}</p>

                  <div className="mt-3.5 rounded-lg border border-border/70 p-2.5 bg-subtle/50 flex items-start gap-2">
                    <ShieldCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-ink-secondary leading-snug">
                      <strong className="text-ink">Safety Boundary: </strong>
                      {meta.governance}
                    </div>
                  </div>
                </div>

                {/* Status Bar & Action */}
                <div className="pt-3 border-t border-border/40 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`size-2 rounded-full ${
                        isEnabled ? "bg-emerald-500 animate-pulse" : "bg-ink-secondary/40"
                      }`}
                    />
                    <span className="font-medium text-ink-secondary">
                      {isEnabled ? "Active & Coordinating" : "Paused"}
                      {isEnabled && getAgentTaskCount(meta.category) > 0 && ` (${getAgentTaskCount(meta.category)} tasks)`}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedAgent(meta)}
                    className="flex items-center gap-1 text-accent hover:underline font-medium"
                  >
                    <Settings size={12} />
                    Instructions
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Instructions Detail Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-menu shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border bg-subtle flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`size-9 rounded-xl bg-gradient-to-br ${selectedAgent.color} flex items-center justify-center text-white`}
                >
                  <selectedAgent.icon size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-[15px] text-ink">
                    {config?.agents[selectedAgent.key]?.displayName || selectedAgent.defaultRoleName} — System Directives
                  </h3>
                  <div className="text-[11px] text-accent">
                    {config?.agents[selectedAgent.key]?.title || selectedAgent.defaultRoleTitle}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAgent(null)}
                className="text-ink-secondary hover:text-ink text-[13px] font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 text-[12px]">
              <div>
                <label className="font-medium text-ink block mb-1">Operational Role</label>
                <div className="p-2.5 rounded-lg bg-subtle text-ink-secondary border border-border">
                  {selectedAgent.description}
                </div>
              </div>

              <div>
                <label className="font-medium text-ink block mb-1">Active Instructions</label>
                <div className="p-2.5 rounded-lg bg-subtle text-ink font-mono text-[11px] border border-border">
                  {config?.agents[selectedAgent.key]?.customInstructions || selectedAgent.defaultInstructions}
                </div>
              </div>

              <div>
                <label className="font-medium text-ink block mb-1">Safeguard & Human Approval Rule</label>
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-[11px]">
                  {selectedAgent.governance}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-subtle flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAgent(null)}
                className="px-4 py-2 bg-accent text-white rounded-md text-[12px] font-medium hover:brightness-110"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
