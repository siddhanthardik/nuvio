import { track } from "@/lib/analytics";
import type { ManagedPolicySummary } from "@/state/config-status";

export type ModelgoOfferAction = "shown" | "get_key" | "add_key" | "not_now" | "close";
export type ModelgoOfferPlace = "popup" | "onboarding" | "settings";

export function reportModelgoOffer(action: ModelgoOfferAction, place: ModelgoOfferPlace) {
  track("modelgo_offer", { action, place });
}

/** Everywhere but a branded build and a desktop whose organization refuses the provider. A Team Cloud's own rules are not that
 * organization's: its Owner and Admins still see the sponsor's card. */
export function modelgoOfferable(_policy?: ManagedPolicySummary | null | undefined): boolean {
  return false;
}
