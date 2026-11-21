import { useState } from "react";
import {
  HeartPulse,
  Users,
  Bot,
  CheckSquare,
  MoreHorizontal,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { useStore } from "@/state/store";

export function NuvioMobileBottomNav() {
  const { state, dispatch } = useStore();
  const [moreOpen, setMoreOpen] = useState(false);

  const activeView = state.activeView;
  const isHome = activeView === "nuvio-operations";
  const isWorkforce = activeView === "nuvio-workforce";
  const isDashboard = activeView === "nuvio-dashboard";

  const handleNav = (destination: "home" | "patients" | "workforce" | "tasks") => {
    setMoreOpen(false);
    if (destination === "home") {
      dispatch({ type: "showOperations" });
      window.dispatchEvent(new CustomEvent("nuvio:switch-tab", { detail: { tab: "patients" } }));
    } else if (destination === "patients") {
      dispatch({ type: "showOperations" });
      window.dispatchEvent(new CustomEvent("nuvio:switch-tab", { detail: { tab: "patients" } }));
    } else if (destination === "workforce") {
      dispatch({ type: "showWorkforce" });
    } else if (destination === "tasks") {
      dispatch({ type: "showOperations" });
      window.dispatchEvent(new CustomEvent("nuvio:switch-tab", { detail: { tab: "tasks" } }));
    }
  };

  const handleOpenMoreItem = (item: "dashboard" | "commQueue" | "settings" | "wizard") => {
    setMoreOpen(false);
    if (item === "dashboard") {
      dispatch({ type: "showDashboard" });
    } else if (item === "commQueue") {
      dispatch({ type: "showOperations" });
      window.dispatchEvent(new CustomEvent("nuvio:switch-tab", { detail: { tab: "commQueue" } }));
    } else if (item === "settings") {
      dispatch({ type: "showOperations" });
      window.dispatchEvent(new CustomEvent("nuvio:open-settings"));
    } else if (item === "wizard") {
      window.dispatchEvent(new CustomEvent("nuvio:open-wizard"));
    }
  };

  return (
    <>
      {/* Mobile Drawer for "More" */}
      {moreOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="w-full bg-menu border-t border-border rounded-t-2xl p-5 pb-8 shadow-2xl flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-secondary pb-3">
              <span className="font-bold text-[15px] text-ink">Nuvio Management</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="p-1 rounded-md text-ink-secondary hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleOpenMoreItem("dashboard")}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-subtle hover:bg-menu-hover text-left transition-colors"
              >
                <div className="size-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
                  <LayoutDashboard size={16} />
                </div>
                <div>
                  <div className="font-semibold text-[13px] text-ink">KPI Analytics</div>
                  <div className="text-[10px] text-ink-secondary">Live metrics</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOpenMoreItem("commQueue")}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-subtle hover:bg-menu-hover text-left transition-colors"
              >
                <div className="size-8 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <div className="font-semibold text-[13px] text-ink">Comms Queue</div>
                  <div className="text-[10px] text-ink-secondary">Approvals & Drafts</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOpenMoreItem("settings")}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-subtle hover:bg-menu-hover text-left transition-colors"
              >
                <div className="size-8 rounded-lg bg-purple-500/15 text-purple-600 flex items-center justify-center shrink-0">
                  <Settings size={16} />
                </div>
                <div>
                  <div className="font-semibold text-[13px] text-ink">Hospital Settings</div>
                  <div className="text-[10px] text-ink-secondary">Rates & Doctors</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOpenMoreItem("wizard")}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-subtle hover:bg-menu-hover text-left transition-colors"
              >
                <div className="size-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                  <Sparkles size={16} />
                </div>
                <div>
                  <div className="font-semibold text-[13px] text-ink">Setup Wizard</div>
                  <div className="text-[10px] text-ink-secondary">Reconfigure Org</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5-Destination Fixed Bottom Navigation Bar for Mobile */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-[60px] bg-menu/95 backdrop-blur-md border-t border-border flex items-center justify-around px-2 shadow-lg safe-bottom"
      >
        {/* 1. Home */}
        <button
          type="button"
          onClick={() => handleNav("home")}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 min-w-[48px] touch-manipulation transition-colors ${
            isHome ? "text-accent font-semibold" : "text-ink-secondary hover:text-ink"
          }`}
        >
          <HeartPulse size={20} className={isHome ? "text-accent" : "text-ink-secondary"} />
          <span className="text-[10px] mt-0.5">Home</span>
        </button>

        {/* 2. Patients */}
        <button
          type="button"
          onClick={() => handleNav("patients")}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 min-w-[48px] touch-manipulation text-ink-secondary hover:text-ink transition-colors"
        >
          <Users size={20} />
          <span className="text-[10px] mt-0.5">Patients</span>
        </button>

        {/* 3. AI Team */}
        <button
          type="button"
          onClick={() => handleNav("workforce")}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 min-w-[48px] touch-manipulation transition-colors ${
            isWorkforce ? "text-accent font-semibold" : "text-ink-secondary hover:text-ink"
          }`}
        >
          <Bot size={20} className={isWorkforce ? "text-accent" : "text-ink-secondary"} />
          <span className="text-[10px] mt-0.5">AI Team</span>
        </button>

        {/* 4. Tasks */}
        <button
          type="button"
          onClick={() => handleNav("tasks")}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 min-w-[48px] touch-manipulation text-ink-secondary hover:text-ink transition-colors"
        >
          <CheckSquare size={20} />
          <span className="text-[10px] mt-0.5">Tasks</span>
        </button>

        {/* 5. More */}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 min-w-[48px] touch-manipulation transition-colors ${
            isDashboard || moreOpen ? "text-accent font-semibold" : "text-ink-secondary hover:text-ink"
          }`}
        >
          <MoreHorizontal size={20} />
          <span className="text-[10px] mt-0.5">More</span>
        </button>
      </nav>
    </>
  );
}
