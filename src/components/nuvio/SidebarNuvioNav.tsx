import { HeartPulse, LayoutDashboard, Bot, Settings } from "lucide-react";
import { cn } from "@/lib/cn";
import { useStore } from "@/state/store";

export function SidebarNuvioNav({
  icons,
  large,
  onOpened,
}: {
  icons: boolean;
  large: boolean;
  onOpened?: () => void;
}) {
  const { state, dispatch } = useStore();
  const operationsActive = state.activeView === "nuvio-operations";
  const workforceActive = state.activeView === "nuvio-workforce";
  const dashboardActive = state.activeView === "nuvio-dashboard";
  const settingsActive = state.activeView === "nuvio-settings";

  const openOperations = () => {
    dispatch({ type: "showOperations" });
    onOpened?.();
  };

  const openWorkforce = () => {
    dispatch({ type: "showWorkforce" });
    onOpened?.();
  };

  const openDashboard = () => {
    dispatch({ type: "showDashboard" });
    onOpened?.();
  };

  const openSettings = () => {
    dispatch({ type: "showHospitalSettings" });
    onOpened?.();
  };

  if (icons) {
    return (
      <div className="flex flex-col gap-1 items-center pb-1">
        <button
          type="button"
          aria-label="Patient Operations"
          title="Patient Operations"
          aria-pressed={operationsActive}
          onClick={openOperations}
          className={cn(
            "relative mx-auto flex size-[46px] shrink-0 items-center justify-center rounded-xl text-ink-secondary hover:bg-raised hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
            operationsActive && "bg-raised text-accent font-semibold"
          )}
        >
          <HeartPulse size={20} aria-hidden="true" />
        </button>

        <button
          type="button"
          aria-label="AI Workforce"
          title="AI Workforce"
          aria-pressed={workforceActive}
          onClick={openWorkforce}
          className={cn(
            "relative mx-auto flex size-[46px] shrink-0 items-center justify-center rounded-xl text-ink-secondary hover:bg-raised hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
            workforceActive && "bg-raised text-accent font-semibold"
          )}
        >
          <Bot size={20} aria-hidden="true" />
        </button>

        <button
          type="button"
          aria-label="Operations Dashboard"
          title="Operations Dashboard"
          aria-pressed={dashboardActive}
          onClick={openDashboard}
          className={cn(
            "relative mx-auto flex size-[46px] shrink-0 items-center justify-center rounded-xl text-ink-secondary hover:bg-raised hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
            dashboardActive && "bg-raised text-accent font-semibold"
          )}
        >
          <LayoutDashboard size={20} aria-hidden="true" />
        </button>

        <button
          type="button"
          aria-label="Hospital Settings"
          title="Hospital Settings"
          aria-pressed={settingsActive}
          onClick={openSettings}
          className={cn(
            "relative mx-auto flex size-[46px] shrink-0 items-center justify-center rounded-xl text-ink-secondary hover:bg-raised hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
            settingsActive && "bg-raised text-accent font-semibold"
          )}
        >
          <Settings size={20} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className="px-3 pb-1 flex flex-col gap-0.5">
      <button
        type="button"
        aria-label="Patient Operations"
        title="Patient Operations"
        aria-pressed={operationsActive}
        onClick={openOperations}
        className={cn(
          "flex w-full min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left outline-none hover:bg-raised/60 focus-visible:ring-2 focus-visible:ring-accent/60 transition-colors",
          operationsActive && "bg-raised text-accent font-medium"
        )}
      >
        <span
          className={cn(
            "relative grid shrink-0 place-items-center rounded-full",
            operationsActive ? "bg-accent/15 text-accent" : "bg-raised text-ink-secondary",
            large ? "size-9" : "size-8"
          )}
        >
          <HeartPulse size={16} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium leading-5 text-ink">
          Patient Operations
        </span>
      </button>

      <button
        type="button"
        aria-label="AI Workforce"
        title="AI Workforce"
        aria-pressed={workforceActive}
        onClick={openWorkforce}
        className={cn(
          "flex w-full min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left outline-none hover:bg-raised/60 focus-visible:ring-2 focus-visible:ring-accent/60 transition-colors",
          workforceActive && "bg-raised text-accent font-medium"
        )}
      >
        <span
          className={cn(
            "relative grid shrink-0 place-items-center rounded-full",
            workforceActive ? "bg-accent/15 text-accent" : "bg-raised text-ink-secondary",
            large ? "size-9" : "size-8"
          )}
        >
          <Bot size={16} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium leading-5 text-ink">
          AI Workforce (9 Agents)
        </span>
      </button>

      <button
        type="button"
        aria-label="Operations Dashboard"
        title="Operations Dashboard"
        aria-pressed={dashboardActive}
        onClick={openDashboard}
        className={cn(
          "flex w-full min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left outline-none hover:bg-raised/60 focus-visible:ring-2 focus-visible:ring-accent/60 transition-colors",
          dashboardActive && "bg-raised text-accent font-medium"
        )}
      >
        <span
          className={cn(
            "relative grid shrink-0 place-items-center rounded-full",
            dashboardActive ? "bg-accent/15 text-accent" : "bg-raised text-ink-secondary",
            large ? "size-9" : "size-8"
          )}
        >
          <LayoutDashboard size={16} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium leading-5 text-ink">
          Operations Dashboard
        </span>
      </button>

      <button
        type="button"
        aria-label="Hospital Settings"
        title="Hospital Settings"
        aria-pressed={settingsActive}
        onClick={openSettings}
        className={cn(
          "flex w-full min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left outline-none hover:bg-raised/60 focus-visible:ring-2 focus-visible:ring-accent/60 transition-colors",
          settingsActive && "bg-raised text-accent font-medium"
        )}
      >
        <span
          className={cn(
            "relative grid shrink-0 place-items-center rounded-full",
            settingsActive ? "bg-accent/15 text-accent" : "bg-raised text-ink-secondary",
            large ? "size-9" : "size-8"
          )}
        >
          <Settings size={16} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium leading-5 text-ink">
          Hospital Settings
        </span>
      </button>
    </div>
  );
}
