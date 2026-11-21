import { useEffect, useState } from "react";
import {
  Users,
  Clock,
  FileText,
  Calendar,
  AlertTriangle,
  UserCheck,
  CheckCircle,
  RefreshCw,
  Building2,
  MapPin,
} from "lucide-react";
import type { DashboardMetrics } from "../../../server/nuvio/dashboard";

export function NuvioDashboard() {
  const [data, setData] = useState<{
    organization: { name: string; type: string; country: string; location: string };
    metrics: DashboardMetrics;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = () => {
    setLoading(true);
    fetch("/api/nuvio/dashboard")
      .then((res) => res.json())
      .then((res) => {
        if (res.ok && res.metrics) {
          setData(res);
        } else {
          setError(res.error || "Failed to load dashboard metrics");
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Network error");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center text-ink-secondary text-[13px]">
        <RefreshCw className="animate-spin mr-2" size={16} />
        Loading Nuvio operational dashboard...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-red-500 text-[13px]">
        {error || "Unable to retrieve operational metrics."}
      </div>
    );
  }

  const { organization, metrics } = data;

  const orgTypeLabel =
    organization.type === "hospital"
      ? "Hospital / Healthcare Provider"
      : organization.type === "medical_tourism_company"
      ? "Medical Tourism Company"
      : "Independent Medical Coordinator";

  return (
    <div className="flex flex-col gap-5 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border-secondary">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-ink">{organization.name}</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent">
              <Building2 size={11} />
              {orgTypeLabel}
            </span>
          </div>
          <div className="flex items-center gap-3 text-ink-secondary text-[12px] mt-1">
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {organization.location}, {organization.country}
            </span>
            <span>•</span>
            <span>Intelligent Medical Tourism Workforce</span>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchDashboard}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border border-border rounded-md hover:bg-menu-hover text-ink"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* New Enquiries */}
        <div className="rounded-lg border border-border p-4 bg-menu">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-[12px] font-medium">New Enquiries</span>
            <Users size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-ink mt-2">{metrics.newEnquiries}</div>
          <p className="text-[11px] text-ink-secondary mt-1">Awaiting initial qualification</p>
        </div>

        {/* Active Leads */}
        <div className="rounded-lg border border-border p-4 bg-menu">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-[12px] font-medium">Active Leads</span>
            <UserCheck size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-ink mt-2">{metrics.activeLeads}</div>
          <p className="text-[11px] text-ink-secondary mt-1">Currently progressing</p>
        </div>

        {/* Follow-ups Due */}
        <div className="rounded-lg border border-border p-4 bg-menu">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-[12px] font-medium">Follow-ups Due</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-ink mt-2">{metrics.followUpsDue}</div>
          <p className="text-[11px] text-ink-secondary mt-1">Due within next 24 hours</p>
        </div>

        {/* Awaiting Action */}
        <div className="rounded-lg border border-border p-4 bg-menu">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-[12px] font-medium">Coordinator Action</span>
            <AlertTriangle size={16} className="text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-ink mt-2">{metrics.leadsAwaitingCoordinatorAction}</div>
          <p className="text-[11px] text-ink-secondary mt-1">Reviews or gates pending</p>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border p-3.5 bg-menu flex items-center gap-3">
          <div className="p-2.5 rounded-md bg-purple-500/10 text-purple-600">
            <FileText size={18} />
          </div>
          <div>
            <div className="text-[11px] font-medium text-ink-secondary">Documents Pending</div>
            <div className="text-lg font-semibold text-ink">{metrics.documentsPending} under review / requested</div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-3.5 bg-menu flex items-center gap-3">
          <div className="p-2.5 rounded-md bg-sky-500/10 text-sky-600">
            <Calendar size={18} />
          </div>
          <div>
            <div className="text-[11px] font-medium text-ink-secondary">Consultation Requests</div>
            <div className="text-lg font-semibold text-ink">{metrics.consultationRequests} awaiting scheduling</div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-3.5 bg-menu flex items-center gap-3">
          <div className="p-2.5 rounded-md bg-teal-500/10 text-teal-600">
            <CheckCircle size={18} />
          </div>
          <div>
            <div className="text-[11px] font-medium text-ink-secondary">Upcoming Confirmed</div>
            <div className="text-lg font-semibold text-ink">{metrics.upcomingConfirmedConsultations} confirmed consultations</div>
          </div>
        </div>
      </div>

      {/* Active Patients Table */}
      <div className="rounded-lg border border-border bg-menu overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-ink">Recent Patient Cases</h2>
          <span className="text-[12px] text-ink-secondary">{metrics.totalPatients} total dossiers recorded</span>
        </div>

        {metrics.recentDossiers.length === 0 ? (
          <div className="p-8 text-center text-ink-secondary text-[13px]">
            No patient cases registered yet. New inquiries from WhatsApp, web forms, or Meta ads will appear here automatically.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="border-b border-border bg-subtle text-ink-secondary font-medium">
                <tr>
                  <th className="py-2.5 px-4">Patient ID</th>
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-4">Country</th>
                  <th className="py-2.5 px-4">Specialty</th>
                  <th className="py-2.5 px-4">Journey Stage</th>
                  <th className="py-2.5 px-4">Active Coordinator</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {metrics.recentDossiers.map((p) => (
                  <tr key={p.patientId} className="hover:bg-menu-hover/50 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium text-ink">{p.patientId}</td>
                    <td className="py-2.5 px-4 font-medium text-ink">{p.name}</td>
                    <td className="py-2.5 px-4 text-ink-secondary">{p.country}</td>
                    <td className="py-2.5 px-4 text-ink-secondary">{p.specialty}</td>
                    <td className="py-2.5 px-4">
                      <span className="inline-block rounded px-2 py-0.5 text-[11px] font-medium bg-subtle text-ink">
                        {p.stage.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-ink-secondary">{p.activeAgent.replace("nuvio_", "")}</td>
                    <td className="py-2.5 px-4">
                      {p.needsAction ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded">
                          Review Needed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
                          In Progress
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
