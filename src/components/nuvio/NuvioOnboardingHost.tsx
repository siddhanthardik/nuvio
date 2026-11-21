import { useEffect, useState } from "react";
import { NuvioOnboardingWizard } from "./NuvioOnboardingWizard";

const DISMISSED_KEY = "nuvio_onboarding_dismissed";

export function NuvioOnboardingHost() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/nuvio/organization")
      .then((res) => res.json())
      .then((data) => {
        if (!alive) return;
        if (data.ok && data.config) {
          if (data.config.onboardingCompleted === false) {
            const dismissed = sessionStorage.getItem(DISMISSED_KEY);
            if (dismissed !== "1") {
              setOpen(true);
            }
          }
        }
      })
      .catch(() => {});

    const handleOpenWizard = () => setOpen(true);
    window.addEventListener("nuvio:open-wizard", handleOpenWizard);

    return () => {
      alive = false;
      window.removeEventListener("nuvio:open-wizard", handleOpenWizard);
    };
  }, []);

  if (!open) return null;

  return (
    <NuvioOnboardingWizard
      onCompleted={() => {
        setOpen(false);
      }}
      onSkip={() => {
        sessionStorage.setItem(DISMISSED_KEY, "1");
        setOpen(false);
      }}
    />
  );
}
