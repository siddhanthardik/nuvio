import { useState } from "react";
import {
  X,
  User,
  Calendar,
  FileText,
  DollarSign,
  Plane,
  Clock,
  ShieldAlert,
  Building2,
  Phone,
  Mail,
  ArrowRight,
  Plus,
  FileCheck,
} from "lucide-react";
import {
  PRIMARY_JOURNEY_STAGES,
  type NuvioPatientDossier,
} from "../../../shared/nuvio/patient-journey";

export function NuvioPatientDossierDetail({
  dossier,
  onClose,
  onUpdateDossier,
}: {
  dossier: NuvioPatientDossier;
  onClose: () => void;
  onUpdateDossier: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "documents" | "consultations" | "financials" | "travel" | "timeline">("overview");
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [addingDoc, setAddingDoc] = useState(false);
  const [transitionNote, setTransitionNote] = useState("");
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const currentStageIndex = PRIMARY_JOURNEY_STAGES.indexOf(dossier.stage as any);
  const nextStage = currentStageIndex >= 0 && currentStageIndex < PRIMARY_JOURNEY_STAGES.length - 1
    ? PRIMARY_JOURNEY_STAGES[currentStageIndex + 1]
    : null;

  const handleAdvanceStage = async (targetStage: string) => {
    setIsAdvancing(true);
    setActionNotice(null);
    try {
      const res = await fetch(`/api/nuvio/dossiers/${dossier.patientId}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: targetStage,
          actor: "Human Coordinator",
          note: transitionNote.trim() || `Advancing patient stage to ${targetStage.replace(/_/g, " ")}.`,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setShowAdvanceModal(false);
        setTransitionNote("");
        setActionNotice(`Patient advanced to ${targetStage.replace(/_/g, " ")}.`);
        onUpdateDossier();
      }
    } catch {
      setActionNotice("Failed to transition patient stage.");
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleVerifyDocument = async (docId: string) => {
    try {
      const res = await fetch(`/api/nuvio/dossiers/${dossier.patientId}/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "accepted",
          isClinicianVerified: true,
        }),
      });
      if (res.ok) {
        setActionNotice("Document marked as Clinician Verified.");
        onUpdateDossier();
      }
    } catch {
      setActionNotice("Failed to update document status.");
    }
  };

  const handleRequestNewDocument = async () => {
    if (!newDocName.trim()) return;
    setAddingDoc(true);
    try {
      const res = await fetch(`/api/nuvio/dossiers/${dossier.patientId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDocName.trim(),
          category: "medical_report",
          notes: "Requested by coordinator",
        }),
      });
      if (res.ok) {
        setNewDocName("");
        setActionNotice(`Document "${newDocName.trim()}" requested.`);
        onUpdateDossier();
      }
    } catch {
      setActionNotice("Failed to request document.");
    } finally {
      setAddingDoc(false);
    }
  };

  const lastUpdated = dossier.timeline.length > 0 ? dossier.timeline[dossier.timeline.length - 1]!.at : dossier.inquiryDate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4">
      <div className="w-full max-w-4xl max-h-[92vh] rounded-2xl border border-border bg-menu shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-subtle/80 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="size-12 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
              {dossier.personal.name.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[17px] font-bold text-ink">{dossier.personal.name}</h2>
                <span className="font-mono text-[11px] text-ink-secondary px-2 py-0.5 rounded bg-subtle border border-border">
                  {dossier.patientId}
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/20">
                  {dossier.stage.replace(/_/g, " ").toUpperCase()}
                </span>
                {dossier.pendingHumanReview?.needed && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-rose-500/10 text-rose-600 border border-rose-500/20">
                    Needs Review
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[12px] text-ink-secondary mt-1.5">
                <span className="flex items-center gap-1">
                  <User size={13} />
                  {dossier.personal.gender || "Unspecified"}, {dossier.personal.age ? `${dossier.personal.age} yrs` : "Age N/A"}
                </span>
                <span>•</span>
                <span>{dossier.personal.country}</span>
                {dossier.personal.phone && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Phone size={13} />
                      {dossier.personal.phone}
                    </span>
                  </>
                )}
                {dossier.personal.email && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Mail size={13} />
                      {dossier.personal.email}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {nextStage && (
              <button
                type="button"
                onClick={() => setShowAdvanceModal(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-[12px] font-semibold hover:brightness-110 shadow-xs transition-all"
              >
                <span>Advance Stage</span>
                <ArrowRight size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="size-8 rounded-lg border border-border bg-subtle text-ink-secondary hover:text-ink flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Action Notice */}
        {actionNotice && (
          <div className="px-5 py-2 bg-accent/10 border-b border-accent/20 text-accent text-[12px] flex items-center justify-between">
            <span>{actionNotice}</span>
            <button type="button" onClick={() => setActionNotice(null)} className="font-bold text-[11px] underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="border-b border-border bg-subtle px-4 flex items-center gap-1 overflow-x-auto">
          {[
            { id: "overview", label: "Clinical Overview", icon: User },
            { id: "documents", label: `Documents (${dossier.documents.length})`, icon: FileText },
            { id: "consultations", label: `Consultations (${dossier.consultations.length})`, icon: Calendar },
            { id: "financials", label: "Treatment Quotes", icon: DollarSign },
            { id: "travel", label: "Visa & Logistics", icon: Plane },
            { id: "timeline", label: `Timeline Audit (${dossier.timeline.length})`, icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "border-accent text-accent font-semibold"
                    : "border-transparent text-ink-secondary hover:text-ink"
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-5 text-[13px]">
          {/* TAB 1: Clinical Overview */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-xl border border-border p-4 bg-subtle/50 flex flex-col gap-3">
                <h3 className="font-bold text-[14px] text-ink flex items-center gap-2">
                  <User size={16} className="text-accent" />
                  Medical Profile & Chief Complaint
                </h3>
                <div>
                  <div className="text-[11px] text-ink-secondary uppercase font-semibold">Specialty</div>
                  <div className="font-medium text-ink">{dossier.clinical.specialty || "General Medicine"}</div>
                </div>
                <div>
                  <div className="text-[11px] text-ink-secondary uppercase font-semibold">Primary Complaint</div>
                  <p className="text-ink leading-relaxed mt-0.5">{dossier.clinical.primaryComplaint || "None reported."}</p>
                </div>
                {dossier.clinical.clinicalSummary && (
                  <div>
                    <div className="text-[11px] text-ink-secondary uppercase font-semibold">Clinical Summary</div>
                    <p className="text-ink leading-relaxed mt-0.5">{dossier.clinical.clinicalSummary}</p>
                  </div>
                )}
                {dossier.clinical.preferredDoctor && (
                  <div>
                    <div className="text-[11px] text-ink-secondary uppercase font-semibold">Preferred Doctor</div>
                    <div className="font-medium text-ink">{dossier.clinical.preferredDoctor}</div>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border p-4 bg-subtle/50 flex flex-col gap-3">
                <h3 className="font-bold text-[14px] text-ink flex items-center gap-2">
                  <Building2 size={16} className="text-accent" />
                  Coordination Context
                </h3>
                <div>
                  <div className="text-[11px] text-ink-secondary uppercase font-semibold">Lead Source</div>
                  <div className="font-medium text-ink uppercase">{dossier.leadSource}</div>
                </div>
                <div>
                  <div className="text-[11px] text-ink-secondary uppercase font-semibold">Active AI Coordinator</div>
                  <div className="font-medium text-ink">{dossier.activeAgent.replace(/_/g, " ").toUpperCase()}</div>
                </div>
                <div>
                  <div className="text-[11px] text-ink-secondary uppercase font-semibold">Preferred Consultation Timing</div>
                  <div className="font-medium text-ink">{dossier.clinical.preferredConsultationTiming || "Flexible"}</div>
                </div>
                <div>
                  <div className="text-[11px] text-ink-secondary uppercase font-semibold">Human Review Status</div>
                  <p className="text-ink text-[12px]">
                    {dossier.pendingHumanReview?.needed
                      ? `Required: ${dossier.pendingHumanReview.reason || "Review pending"}`
                      : "No blocking human review required."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Documents */}
          {activeTab === "documents" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <h3 className="font-bold text-[14px] text-ink">Diagnostic Reports, Scans & IDs</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Request document name..."
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-border bg-subtle text-[12px] text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <button
                    type="button"
                    disabled={addingDoc || !newDocName.trim()}
                    onClick={handleRequestNewDocument}
                    className="flex items-center gap-1 px-3 py-1.5 bg-accent text-white rounded-lg text-[12px] font-medium hover:brightness-110 disabled:opacity-50 shrink-0"
                  >
                    <Plus size={14} />
                    Request
                  </button>
                </div>
              </div>

              {dossier.documents.length === 0 ? (
                <div className="p-8 text-center text-ink-secondary border border-border rounded-xl bg-subtle/50 text-[12px]">
                  No diagnostic documents registered for this patient yet. Use the field above to request one.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {dossier.documents.map((doc) => (
                    <div key={doc.id} className="p-3.5 rounded-xl border border-border bg-subtle/40 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <FileCheck size={18} className="text-accent shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-ink text-[13px]">{doc.name}</div>
                          <div className="text-[11px] text-ink-secondary">Category: {doc.category}</div>
                          {doc.receivedAt && (
                            <div className="text-[10px] text-ink-secondary mt-0.5">
                              Received: {new Date(doc.receivedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                            doc.isClinicianVerified
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : doc.status === "received"
                              ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                              : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                          }`}
                        >
                          {doc.isClinicianVerified ? "Verified" : doc.status.replace(/_/g, " ")}
                        </span>
                        {!doc.isClinicianVerified && (
                          <button
                            type="button"
                            onClick={() => handleVerifyDocument(doc.id)}
                            className="text-[11px] text-accent hover:underline font-semibold"
                          >
                            Mark Verified
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Consultations */}
          {activeTab === "consultations" && (
            <div className="flex flex-col gap-4">
              <h3 className="font-bold text-[14px] text-ink">Specialist Teleconsultations & Appointments</h3>
              {dossier.consultations.length === 0 ? (
                <div className="p-8 text-center text-ink-secondary border border-border rounded-xl bg-subtle/50 text-[12px]">
                  No consultations scheduled yet. Advance patient to "Consultation Requested" or "Consultation Scheduled".
                </div>
              ) : (
                <div className="space-y-3">
                  {dossier.consultations.map((c) => (
                    <div key={c.id} className="p-4 rounded-xl border border-border bg-subtle/50 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-ink text-[14px] flex items-center gap-2">
                          <Calendar size={16} className="text-accent" />
                          <span>{c.mode.toUpperCase()} Consult — {c.doctorName || c.department || "Hospital Specialist"}</span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-menu font-bold text-[11px] border border-border text-ink">
                          {c.schedulingStatus.toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[12px] text-ink-secondary pt-1">
                        <div>Hospital: <strong className="text-ink">{c.hospitalName || "In-house"}</strong></div>
                        <div>Date: <strong className="text-ink">{c.requestedDate || "TBD"}</strong></div>
                        <div>Slot: <strong className="text-ink">{c.preferredTimeSlot || "TBD"}</strong></div>
                      </div>
                      {c.coordinatorNotes && (
                        <div className="text-[12px] text-ink bg-menu p-2.5 rounded-lg border border-border mt-1">
                          <strong>Notes: </strong>{c.coordinatorNotes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Financial Quotes */}
          {activeTab === "financials" && (
            <div className="flex flex-col gap-4">
              <h3 className="font-bold text-[14px] text-ink">Treatment Estimates & Multi-Currency Quotes</h3>
              <div className="rounded-xl border border-border p-4 bg-subtle/50 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-[13px] text-ink">
                    Procedure: {dossier.estimate.procedureName || "Package Evaluation"}
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      dossier.estimate.approvedByCoordinator
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                    }`}
                  >
                    {dossier.estimate.approvedByCoordinator ? "Approved by Coordinator" : "Draft / Pending Coordinator Approval"}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-menu border border-border">
                    <div className="text-[11px] text-ink-secondary">Min Estimate</div>
                    <div className="text-[15px] font-bold text-ink mt-0.5">
                      {dossier.estimate.currency} {dossier.estimate.costRangeMin?.toLocaleString() || "—"}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-menu border border-border">
                    <div className="text-[11px] text-ink-secondary">Max Estimate</div>
                    <div className="text-[15px] font-bold text-ink mt-0.5">
                      {dossier.estimate.currency} {dossier.estimate.costRangeMax?.toLocaleString() || "—"}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-menu border border-border">
                    <div className="text-[11px] text-ink-secondary">Currency</div>
                    <div className="text-[13px] font-semibold text-ink mt-0.5">
                      {dossier.estimate.currency}
                    </div>
                  </div>
                </div>

                {dossier.estimate.inclusions.length > 0 && (
                  <div className="pt-2">
                    <div className="text-[11px] text-ink-secondary font-semibold uppercase">Package Inclusions</div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {dossier.estimate.inclusions.map((inc, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 text-[11px]">
                          ✓ {inc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: Visa & Travel */}
          {activeTab === "travel" && (
            <div className="flex flex-col gap-4">
              <h3 className="font-bold text-[14px] text-ink">Medical Visa, Flights & Logistics</h3>
              <div className="rounded-xl border border-border p-4 bg-subtle/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] text-ink-secondary uppercase font-semibold">Visa Invitation Letter</div>
                  <div className="font-medium text-ink mt-0.5">
                    {dossier.visaTravel.visaInvitationIssued ? "Issued & Dispatched" : "Pending Human Sign-off"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-ink-secondary uppercase font-semibold">Passport Number</div>
                  <div className="font-medium text-ink mt-0.5 font-mono">{dossier.visaTravel.passportNumber || "Not recorded yet"}</div>
                </div>
                <div>
                  <div className="text-[11px] text-ink-secondary uppercase font-semibold">Airport Pickup Required</div>
                  <div className="font-medium text-ink mt-0.5">{dossier.visaTravel.airportPickupRequired ? "Yes, Airport Transport Requested" : "No"}</div>
                </div>
                <div>
                  <div className="text-[11px] text-ink-secondary uppercase font-semibold">Estimated Arrival Date</div>
                  <div className="font-medium text-ink mt-0.5">{dossier.visaTravel.arrivalDate || "Not confirmed yet"}</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Case Timeline Audit */}
          {activeTab === "timeline" && (
            <div className="flex flex-col gap-3">
              <h3 className="font-bold text-[14px] text-ink">Chronological Case Timeline & Audit Log</h3>
              <div className="border-l-2 border-accent/40 pl-4 space-y-4 pt-1">
                {dossier.timeline.map((ev, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-accent ring-2 ring-menu" />
                    <div className="flex items-center justify-between text-[11px] text-ink-secondary">
                      <span className="font-semibold text-ink">{ev.actor}</span>
                      <span>{new Date(ev.at).toLocaleString()}</span>
                    </div>
                    <p className="text-[13px] text-ink mt-1 leading-relaxed">{ev.note}</p>
                    {ev.requiresHumanApproval && (
                      <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-700 text-[11px] font-medium">
                        <ShieldAlert size={12} />
                        Requires coordinator approval {ev.approved ? "(Approved)" : "(Pending)"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Advance Stage Modal */}
        {showAdvanceModal && nextStage && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-xl border border-border bg-menu shadow-2xl p-5 flex flex-col gap-3">
              <h4 className="font-bold text-[15px] text-ink">Advance Patient Stage</h4>
              <p className="text-[12px] text-ink-secondary">
                Move patient from <strong className="text-ink">{dossier.stage}</strong> to{" "}
                <strong className="text-accent">{nextStage}</strong>?
              </p>
              <textarea
                rows={2}
                placeholder="Optional coordinator note..."
                value={transitionNote}
                onChange={(e) => setTransitionNote(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-border bg-subtle text-[12px] text-ink"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(false)}
                  className="px-3 py-1.5 text-[12px] text-ink-secondary hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isAdvancing}
                  onClick={() => handleAdvanceStage(nextStage)}
                  className="px-4 py-1.5 bg-accent text-white rounded-lg text-[12px] font-semibold hover:brightness-110 disabled:opacity-50"
                >
                  {isAdvancing ? "Advancing..." : "Confirm Stage Move"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-border bg-subtle/80 flex items-center justify-between">
          <div className="text-[11px] text-ink-secondary">
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-[12px] font-medium bg-accent text-white rounded-lg hover:brightness-110 shadow-xs"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
}
