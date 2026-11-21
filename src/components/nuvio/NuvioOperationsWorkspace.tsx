import { useEffect, useState } from "react";
import {
  Users,
  Search,
  Filter,
  CheckCircle,
  Clock,
  MessageSquare,
  Check,
  X,
  Play,
  ShieldAlert,
} from "lucide-react";
import type { NuvioPatientDossier } from "../../../shared/nuvio/patient-journey";
import type {
  CommunicationQueueItem,
  CoordinatorTask,
} from "../../../shared/nuvio/patient-operations";

export function NuvioOperationsWorkspace() {
  const [activeTab, setActiveTab] = useState<"patients" | "tasks" | "commQueue">("patients");
  const [patients, setPatients] = useState<NuvioPatientDossier[]>([]);
  const [tasks, setTasks] = useState<CoordinatorTask[]>([]);
  const [commQueue, setCommQueue] = useState<CommunicationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [quickFilter, setQuickFilter] = useState<"all" | "needsResponse" | "overdue" | "pendingDocs" | "consults">("all");
  const [selectedPatient, setSelectedPatient] = useState<NuvioPatientDossier | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editedMessage, setEditedMessage] = useState("");
  const [runningNurturing, setRunningNurturing] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const qParams = new URLSearchParams();
      if (search.trim()) qParams.set("search", search.trim());
      if (stageFilter) qParams.set("stage", stageFilter);
      if (quickFilter === "needsResponse") qParams.set("needsResponse", "true");
      if (quickFilter === "overdue") qParams.set("overdue", "true");
      if (quickFilter === "pendingDocs") qParams.set("pendingDocs", "true");
      if (quickFilter === "consults") qParams.set("consults", "true");

      const [pRes, tRes, qRes] = await Promise.all([
        fetch(`/api/nuvio/operations/patients?${qParams.toString()}`).then((r) => r.json()),
        fetch("/api/nuvio/operations/tasks").then((r) => r.json()),
        fetch("/api/nuvio/operations/communication-queue").then((r) => r.json()),
      ]);

      if (pRes.ok) setPatients(pRes.dossiers || []);
      if (tRes.ok) setTasks(tRes.tasks || []);
      if (qRes.ok) setCommQueue(qRes.queue || []);
    } catch {
      // Quiet fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, stageFilter, quickFilter]);

  const handleRunNurturing = async () => {
    setRunningNurturing(true);
    try {
      const res = await fetch("/api/nuvio/operations/evaluate-nurturing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.ok) {
        setBannerNotice(
          `Lead nurturing rules evaluated: ${data.generatedTasks?.length || 0} tasks and ${data.generatedDrafts?.length || 0} drafts generated.`
        );
        setTimeout(() => setBannerNotice(null), 4000);
        await loadData();
      }
    } finally {
      setRunningNurturing(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/nuvio/operations/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed", completedBy: "coordinator" }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch {
      // Quiet
    }
  };

  const handleApproveDraft = async (draftId: string) => {
    try {
      const res = await fetch(`/api/nuvio/operations/communication-queue/${draftId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewedBy: "coordinator" }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch {
      // Quiet
    }
  };

  const handleRejectDraft = async (draftId: string) => {
    const reason = window.prompt("Reason for rejection:") || "Revised coordinator outreach";
    try {
      const res = await fetch(`/api/nuvio/operations/communication-queue/${draftId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewedBy: "coordinator", reason }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch {
      // Quiet
    }
  };

  const handleSaveDraftEdit = async (draftId: string) => {
    if (!editedMessage.trim()) return;
    try {
      const res = await fetch(`/api/nuvio/operations/communication-queue/${draftId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftMessage: editedMessage.trim() }),
      });
      if (res.ok) {
        setEditingDraftId(null);
        await loadData();
      }
    } catch {
      // Quiet
    }
  };

  return (
    <div className="flex flex-col gap-4 p-5 max-w-6xl mx-auto">
      {/* Top Banner & Title */}
      <div className="flex items-center justify-between pb-3 border-b border-border-secondary">
        <div>
          <h1 className="text-lg font-semibold text-ink">Patient Operations & Nurturing Workspace</h1>
          <p className="text-[12px] text-ink-secondary mt-0.5">
            Coordinate patient enquiries, review draft communications, and action clinical milestones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRunNurturing}
            disabled={runningNurturing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-accent text-white rounded-md hover:brightness-110 disabled:opacity-50 transition-all shadow-xs"
          >
            <Play size={12} className={runningNurturing ? "animate-spin" : ""} />
            {runningNurturing ? "Evaluating..." : "Run Lead Nurturing Rules"}
          </button>
        </div>
      </div>

      {bannerNotice && (
        <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3 text-[12px] text-emerald-600 font-medium flex items-center justify-between">
          <span>{bannerNotice}</span>
          <button type="button" onClick={() => setBannerNotice(null)} className="text-emerald-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Workspace Tabs */}
      <div className="flex gap-2 border-b border-border-secondary pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("patients")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
            activeTab === "patients"
              ? "bg-accent/10 text-accent font-semibold"
              : "text-ink-secondary hover:text-ink hover:bg-menu-hover"
          }`}
        >
          <Users size={14} />
          Patient Cases ({patients.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("tasks")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
            activeTab === "tasks"
              ? "bg-accent/10 text-accent font-semibold"
              : "text-ink-secondary hover:text-ink hover:bg-menu-hover"
          }`}
        >
          <Clock size={14} />
          Tasks Due Today ({tasks.filter((t) => t.status === "pending").length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("commQueue")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
            activeTab === "commQueue"
              ? "bg-accent/10 text-accent font-semibold"
              : "text-ink-secondary hover:text-ink hover:bg-menu-hover"
          }`}
        >
          <MessageSquare size={14} />
          Communication Queue ({commQueue.filter((q) => q.status === "pending_review").length})
        </button>
      </div>

      {/* TAB 1: Patients List & Search */}
      {activeTab === "patients" && (
        <div className="flex flex-col gap-3">
          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-menu p-3 rounded-lg border border-border">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search size={14} className="text-ink-secondary" />
              <input
                type="text"
                placeholder="Search by patient name, phone, email, or Case ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-[13px] bg-transparent text-ink focus:outline-none placeholder:text-ink-secondary"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={13} className="text-ink-secondary" />
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="rounded-md border border-border px-2 py-1 text-[12px] bg-menu text-ink"
              >
                <option value="">All Journey Stages</option>
                <option value="new_enquiry">New Enquiry</option>
                <option value="patient_qualification">Patient Qualification</option>
                <option value="documents_pending">Documents Pending</option>
                <option value="consultation_requested">Consultation Requested</option>
                <option value="estimate_shared">Estimate Shared</option>
                <option value="visa_assistance">Visa Assistance</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => setQuickFilter("all")}
              className={`px-2.5 py-1 rounded-full border transition-colors ${
                quickFilter === "all" ? "bg-accent text-white border-accent" : "bg-menu border-border text-ink-secondary hover:text-ink"
              }`}
            >
              All Cases
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter("needsResponse")}
              className={`px-2.5 py-1 rounded-full border transition-colors ${
                quickFilter === "needsResponse" ? "bg-accent text-white border-accent" : "bg-menu border-border text-ink-secondary hover:text-ink"
              }`}
            >
              Needs Response
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter("overdue")}
              className={`px-2.5 py-1 rounded-full border transition-colors ${
                quickFilter === "overdue" ? "bg-accent text-white border-accent" : "bg-menu border-border text-ink-secondary hover:text-ink"
              }`}
            >
              Overdue Follow-ups
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter("pendingDocs")}
              className={`px-2.5 py-1 rounded-full border transition-colors ${
                quickFilter === "pendingDocs" ? "bg-accent text-white border-accent" : "bg-menu border-border text-ink-secondary hover:text-ink"
              }`}
            >
              Pending Documents
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter("consults")}
              className={`px-2.5 py-1 rounded-full border transition-colors ${
                quickFilter === "consults" ? "bg-accent text-white border-accent" : "bg-menu border-border text-ink-secondary hover:text-ink"
              }`}
            >
              Consultation Requests
            </button>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-border bg-menu overflow-hidden">
            <table className="w-full text-left text-[12px]">
              <thead className="border-b border-border bg-subtle text-ink-secondary font-medium">
                <tr>
                  <th className="py-2.5 px-4">Case ID</th>
                  <th className="py-2.5 px-4">Patient</th>
                  <th className="py-2.5 px-4">Origin</th>
                  <th className="py-2.5 px-4">Specialty</th>
                  <th className="py-2.5 px-4">Stage</th>
                  <th className="py-2.5 px-4">Coordinator</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {patients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-ink-secondary">
                      {loading ? "Loading cases..." : "No matching patient records found."}
                    </td>
                  </tr>
                ) : (
                  patients.map((p) => (
                    <tr key={p.patientId} className="hover:bg-menu-hover/50 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium text-ink">{p.patientId}</td>
                      <td className="py-2.5 px-4 font-medium text-ink">
                        <div>{p.personal.name}</div>
                        <div className="text-[11px] text-ink-secondary font-normal">{p.personal.phone || p.personal.email || "No direct contact"}</div>
                      </td>
                      <td className="py-2.5 px-4 text-ink-secondary">{p.personal.country}</td>
                      <td className="py-2.5 px-4 text-ink-secondary">{p.clinical.specialty || "General"}</td>
                      <td className="py-2.5 px-4">
                        <span className="inline-block rounded px-2 py-0.5 text-[11px] font-medium bg-subtle text-ink">
                          {p.stage.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-ink-secondary">{p.activeAgent.replace("nuvio_", "")}</td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedPatient(p)}
                          className="px-2.5 py-1 text-[11px] font-medium bg-accent/10 text-accent rounded hover:bg-accent/20 transition-colors"
                        >
                          View History
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Tasks Due Today */}
      {activeTab === "tasks" && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-2.5">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-ink-secondary border border-border rounded-lg bg-menu text-[13px]">
                No pending coordinator tasks. Click "Run Lead Nurturing Rules" to evaluate active dossiers.
              </div>
            ) : (
              tasks.map((t) => (
                <div
                  key={t.id}
                  className={`p-3.5 rounded-lg border bg-menu flex items-start justify-between gap-3 ${
                    t.status === "completed" ? "opacity-60 border-border" : "border-border"
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 mt-0.5 ${
                        t.priority === "urgent"
                          ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                          : t.priority === "high"
                          ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                          : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                      }`}
                    >
                      {t.priority}
                    </span>
                    <div>
                      <div className="text-[13px] font-medium text-ink flex items-center gap-2">
                        <span>{t.title}</span>
                        <span className="font-mono text-[11px] text-ink-secondary">({t.patientId})</span>
                      </div>
                      <p className="text-[12px] text-ink-secondary mt-0.5 leading-relaxed">{t.description}</p>
                      <div className="flex items-center gap-3 text-[11px] text-ink-secondary mt-2">
                        <span>Category: {t.category.replace(/_/g, " ")}</span>
                        <span>•</span>
                        <span>Assigned: {t.assignedCoordinator}</span>
                        <span>•</span>
                        <span>Due: {new Date(t.dueDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {t.status === "completed" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 text-[12px] font-medium">
                        <CheckCircle size={14} />
                        Completed
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCompleteTask(t.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors shadow-xs"
                      >
                        <Check size={13} />
                        Mark Done
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Communication Queue */}
      {activeTab === "commQueue" && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-2.5">
            {commQueue.length === 0 ? (
              <div className="p-8 text-center text-ink-secondary border border-border rounded-lg bg-menu text-[13px]">
                No pending communication drafts in queue.
              </div>
            ) : (
              commQueue.map((item) => (
                <div key={item.id} className="p-4 rounded-lg border border-border bg-menu flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-ink">{item.patientName}</span>
                      <span className="font-mono text-[11px] text-ink-secondary">({item.patientId})</span>
                      <span className="px-2 py-0.5 text-[10px] rounded bg-subtle text-ink font-medium">
                        {item.purpose.replace(/_/g, " ")}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                        item.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : item.status === "rejected"
                          ? "bg-rose-500/10 text-rose-600"
                          : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      {item.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  {editingDraftId === item.id ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={editedMessage}
                        onChange={(e) => setEditedMessage(e.target.value)}
                        className="w-full rounded-md border border-border p-2.5 text-[12px] bg-subtle text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                        rows={3}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingDraftId(null)}
                          className="px-2.5 py-1 text-[11px] border border-border rounded text-ink"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveDraftEdit(item.id)}
                          className="px-2.5 py-1 text-[11px] bg-accent text-white rounded font-medium"
                        >
                          Save Edit
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-md bg-subtle text-[12px] text-ink leading-relaxed border border-border/60">
                      "{item.draftMessage}"
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[11px] text-ink-secondary">
                      Channel: {item.channel.toUpperCase()} • Language: {item.language}
                    </div>

                    {item.status === "pending_review" && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDraftId(item.id);
                            setEditedMessage(item.draftMessage);
                          }}
                          className="px-2.5 py-1 text-[11px] font-medium border border-border rounded hover:bg-menu-hover text-ink"
                        >
                          Edit Draft
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectDraft(item.id)}
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border border-rose-500/30 text-rose-600 rounded hover:bg-rose-500/10"
                        >
                          <X size={12} />
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveDraft(item.id)}
                          className="flex items-center gap-1 px-3 py-1 text-[11px] font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 shadow-xs"
                        >
                          <Check size={12} />
                          Approve
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Case Timeline Drawer / Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-xl border border-border bg-menu shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border bg-subtle flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-ink">
                  Case History: {selectedPatient.personal.name} ({selectedPatient.patientId})
                </h3>
                <p className="text-[11px] text-ink-secondary mt-0.5">
                  Origin: {selectedPatient.personal.country} • Specialty: {selectedPatient.clinical.specialty || "General"} • Stage: {selectedPatient.stage}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="text-ink-secondary hover:text-ink p-1 rounded-md"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
              {/* Timeline Events */}
              <div>
                <h4 className="text-[12px] font-bold text-ink uppercase tracking-wider mb-2">Chronological Case Timeline</h4>
                <div className="border-l-2 border-border pl-4 space-y-3.5">
                  {selectedPatient.timeline.map((ev, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-accent" />
                      <div className="flex items-center justify-between text-[11px] text-ink-secondary">
                        <span className="font-semibold text-ink">{ev.actor}</span>
                        <span>{new Date(ev.at).toLocaleString()}</span>
                      </div>
                      <p className="text-[12px] text-ink mt-0.5">{ev.note}</p>
                      {ev.requiresHumanApproval && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                          <ShieldAlert size={11} />
                          Requires coordinator sign-off {ev.approved ? "(Confirmed)" : "(Pending)"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Consultations */}
              {selectedPatient.consultations && selectedPatient.consultations.length > 0 && (
                <div>
                  <h4 className="text-[12px] font-bold text-ink uppercase tracking-wider mb-2">Consultations</h4>
                  <div className="space-y-2">
                    {selectedPatient.consultations.map((c) => (
                      <div key={c.id} className="p-2.5 rounded border border-border bg-subtle text-[12px]">
                        <div className="flex items-center justify-between font-medium text-ink">
                          <span>{c.mode.toUpperCase()} Consultation with {c.doctorName || c.department || "Specialist"}</span>
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-menu font-bold">{c.schedulingStatus}</span>
                        </div>
                        {c.confirmedDateTime && (
                          <div className="text-[11px] text-emerald-600 mt-1">Confirmed for: {c.confirmedDateTime}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              {selectedPatient.documents && selectedPatient.documents.length > 0 && (
                <div>
                  <h4 className="text-[12px] font-bold text-ink uppercase tracking-wider mb-2">Diagnostic Reports & Documents</h4>
                  <div className="space-y-2">
                    {selectedPatient.documents.map((doc) => (
                      <div key={doc.id} className="p-2.5 rounded border border-border bg-subtle text-[12px] flex items-center justify-between">
                        <div>
                          <div className="font-medium text-ink">{doc.name}</div>
                          <div className="text-[11px] text-ink-secondary">Category: {doc.category}</div>
                        </div>
                        <span className={`px-2 py-0.5 text-[11px] rounded font-medium ${
                          doc.isClinicianVerified ? "bg-emerald-500/10 text-emerald-600" : "bg-menu text-ink"
                        }`}>
                          {doc.status} {doc.isClinicianVerified ? "• Verified" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border bg-subtle flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="px-4 py-1.5 text-[12px] font-medium bg-accent text-white rounded-md"
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
