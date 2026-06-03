export const OPPORTUNITY_MODE_STORAGE_KEY = "globaleads-opportunity-mode";

export function isOpportunityModeEnabled(): boolean {
  if (import.meta.env.VITE_ENABLE_OPPORTUNITY_MODE === "true") {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return (
    params.get("opportunity") === "1" ||
    params.get("opportunityMode") === "1" ||
    window.localStorage.getItem(OPPORTUNITY_MODE_STORAGE_KEY) === "true"
  );
}
