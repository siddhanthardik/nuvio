import { useState } from "react";
import { Building2, Globe2, User, Check, ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react";
import type {
  CommunicationStyle,
  NuvioOrganizationConfig,
  OrganizationType,
} from "../../../shared/nuvio/organization-config";

interface WizardProps {
  onCompleted: (config: NuvioOrganizationConfig) => void;
  onSkip?: () => void;
}

export function NuvioOnboardingWizard({ onCompleted, onSkip }: WizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [orgType, setOrgType] = useState<OrganizationType>("hospital");
  const [orgName, setOrgName] = useState("");
  const [country, setCountry] = useState("India");
  const [location, setLocation] = useState("New Delhi");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [commStyle, setCommStyle] = useState<CommunicationStyle>("warm_professional");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!orgName.trim()) {
      setError("Please enter your organization's name to proceed.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/nuvio/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationType: orgType,
          organizationName: orgName.trim(),
          country: country.trim() || "India",
          operatingLocation: location.trim() || "New Delhi",
          contactWhatsApp: whatsapp.trim() || undefined,
          contactEmail: email.trim() || undefined,
          defaultCurrency: currency,
          communicationStyle: commStyle,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to complete onboarding.");
      }
      onCompleted(data.config);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl rounded-xl border border-border bg-menu shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-border-secondary p-5 bg-subtle">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-white font-bold text-[13px]">
              N
            </span>
            <span className="font-semibold text-ink text-[16px]">Nuvio Onboarding Setup</span>
          </div>
          <p className="text-ink-secondary text-[12px] mt-1">
            Configure your AI patient coordination workforce in 3 simple steps.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col gap-5">
          {error && (
            <div className="rounded-md bg-rose-500/10 border border-rose-500/20 p-3 text-[12px] text-rose-600">
              {error}
            </div>
          )}

          {/* STEP 1: Organization Type */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-[15px] font-semibold text-ink">Who will Nuvio work for?</h2>
                <p className="text-[12px] text-ink-secondary mt-0.5">
                  Select your organization model to tailor inquiry qualification and doctor coordination.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {/* Option 1: Hospital */}
                <button
                  type="button"
                  onClick={() => setOrgType("hospital")}
                  className={`flex items-start gap-3.5 p-3.5 rounded-lg border text-left transition-all ${
                    orgType === "hospital"
                      ? "border-accent bg-accent/5 ring-1 ring-accent"
                      : "border-border hover:bg-menu-hover"
                  }`}
                >
                  <div className={`p-2 rounded-md ${orgType === "hospital" ? "bg-accent text-white" : "bg-subtle text-ink-secondary"}`}>
                    <Building2 size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-[13px] text-ink">Hospital / Healthcare Provider</div>
                    <div className="text-[11px] text-ink-secondary mt-0.5">
                      Works for one hospital. Coordinates in-house departments, consultant doctors, and clinical estimates.
                    </div>
                  </div>
                  {orgType === "hospital" && <Check size={16} className="text-accent mt-1" />}
                </button>

                {/* Option 2: Medical Tourism Company */}
                <button
                  type="button"
                  onClick={() => setOrgType("medical_tourism_company")}
                  className={`flex items-start gap-3.5 p-3.5 rounded-lg border text-left transition-all ${
                    orgType === "medical_tourism_company"
                      ? "border-accent bg-accent/5 ring-1 ring-accent"
                      : "border-border hover:bg-menu-hover"
                  }`}
                >
                  <div className={`p-2 rounded-md ${orgType === "medical_tourism_company" ? "bg-accent text-white" : "bg-subtle text-ink-secondary"}`}>
                    <Globe2 size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-[13px] text-ink">Medical Tourism Company</div>
                    <div className="text-[11px] text-ink-secondary mt-0.5">
                      Coordinates international patients across multiple partner hospitals, compare estimates, visas, and logistics.
                    </div>
                  </div>
                  {orgType === "medical_tourism_company" && <Check size={16} className="text-accent mt-1" />}
                </button>

                {/* Option 3: Independent Medical Coordinator */}
                <button
                  type="button"
                  onClick={() => setOrgType("independent_coordinator")}
                  className={`flex items-start gap-3.5 p-3.5 rounded-lg border text-left transition-all ${
                    orgType === "independent_coordinator"
                      ? "border-accent bg-accent/5 ring-1 ring-accent"
                      : "border-border hover:bg-menu-hover"
                  }`}
                >
                  <div className={`p-2 rounded-md ${orgType === "independent_coordinator" ? "bg-accent text-white" : "bg-subtle text-ink-secondary"}`}>
                    <User size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-[13px] text-ink">Independent Medical Coordinator</div>
                    <div className="text-[11px] text-ink-secondary mt-0.5">
                      Individual healthcare advisor or facilitator managing patient second opinions and hospital referrals.
                    </div>
                  </div>
                  {orgType === "independent_coordinator" && <Check size={16} className="text-accent mt-1" />}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Organization Name & Location */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-[15px] font-semibold text-ink">Organization Details</h2>
                <p className="text-[12px] text-ink-secondary mt-0.5">
                  Provide your official name and operating hub for international patients.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[12px] font-medium text-ink block mb-1">
                    Organization / Hospital Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      orgType === "hospital"
                        ? "e.g. Metro Heart & Cancer Institute"
                        : orgType === "medical_tourism_company"
                        ? "e.g. CareCross International Health"
                        : "e.g. Dr. Mehta Patient Coordination"
                    }
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full rounded-md border border-border px-3 py-2 text-[13px] bg-subtle text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] font-medium text-ink block mb-1">Operating City / Location</label>
                    <input
                      type="text"
                      placeholder="e.g. New Delhi, Istanbul"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full rounded-md border border-border px-3 py-2 text-[13px] bg-subtle text-ink"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-medium text-ink block mb-1">Destination Country</label>
                    <input
                      type="text"
                      placeholder="e.g. India, Turkey, Thailand"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full rounded-md border border-border px-3 py-2 text-[13px] bg-subtle text-ink"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] font-medium text-ink block mb-1">WhatsApp for Inquiries (Optional)</label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full rounded-md border border-border px-3 py-2 text-[13px] bg-subtle text-ink"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-medium text-ink block mb-1">Official Email (Optional)</label>
                    <input
                      type="email"
                      placeholder="coordinator@hospital.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-md border border-border px-3 py-2 text-[13px] bg-subtle text-ink"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Communication & Review */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-[15px] font-semibold text-ink">Patient Communication & Launch</h2>
                <p className="text-[12px] text-ink-secondary mt-0.5">
                  Choose how your AI workforce greets and guides incoming patients.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[12px] font-medium text-ink block mb-1">Default Communication Style</label>
                  <select
                    value={commStyle}
                    onChange={(e) => setCommStyle(e.target.value as CommunicationStyle)}
                    className="w-full rounded-md border border-border px-3 py-2 text-[13px] bg-subtle text-ink"
                  >
                    <option value="warm_professional">Warm & Professional (Empathetic 1-3 short sentences)</option>
                    <option value="concise_direct">Concise & Direct (Brief, fact-focused)</option>
                    <option value="clinical_formal">Clinical & Formal (Standard institutional tone)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[12px] font-medium text-ink block mb-1">Default Package Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-md border border-border px-3 py-2 text-[13px] bg-subtle text-ink"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AED">AED (د.إ)</option>
                    <option value="BDT">BDT (৳)</option>
                  </select>
                </div>

                <div className="rounded-lg border border-border p-3.5 bg-subtle flex items-start gap-2.5 mt-1">
                  <ShieldCheck size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-ink-secondary leading-relaxed">
                    <strong className="text-ink">Patient Safety & Quality Safeguards:</strong> Nuvio strictly enforces
                    non-diagnostic clinical boundaries, limits responses to 1-3 short sentences, and requires human coordinator
                    approval before final surgical package estimates or visa invitation letters are released.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border-secondary p-4 bg-subtle flex items-center justify-between">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2)}
                className="flex items-center gap-1 text-[12px] font-medium text-ink-secondary hover:text-ink px-2 py-1"
              >
                <ArrowLeft size={13} />
                Back
              </button>
            )}
            {step === 1 && onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="text-[12px] text-ink-secondary hover:text-ink px-2 py-1"
              >
                Skip for now
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-ink-secondary mr-2">Step {step} of 3</span>
            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 2 && !orgName.trim()) {
                    setError("Please enter your organization name.");
                    return;
                  }
                  setError(null);
                  setStep((s) => (s + 1) as 2 | 3);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-md text-[13px] font-medium hover:brightness-110 shadow-sm"
              >
                Next
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-md text-[13px] font-medium hover:brightness-110 shadow-sm disabled:opacity-50"
              >
                <Check size={14} />
                {submitting ? "Finishing Setup..." : "Complete Setup"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
