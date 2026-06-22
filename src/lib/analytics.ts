import posthog from "posthog-js";

type Props = Record<string, unknown>;

// Thin, safe wrappers around posthog-js. The instance is initialised by
// <PostHogProvider> in main.tsx; these no-op when analytics isn't configured
// (e.g. local/preview builds with no VITE_POSTHOG_PROJECT_TOKEN).
const ready = () => {
  try {
    return Boolean((posthog as unknown as { __loaded?: boolean }).__loaded);
  } catch {
    return false;
  }
};

export const track = (event: string, props?: Props) => {
  if (ready()) posthog.capture(event, props);
};

export const identifyUser = (id: string, props?: Props) => {
  if (ready()) posthog.identify(id, props);
};

export const resetAnalytics = () => {
  if (ready()) posthog.reset();
};

// Build a deep-link into the PostHog app for an identified user's person page
// (which exposes their session recordings). Returns null when the project id
// env var isn't configured, so callers can hide the link.
export const posthogPersonUrl = (distinctId: string): string | null => {
  const projectId = import.meta.env.VITE_POSTHOG_PROJECT_ID as string | undefined;
  if (!projectId || !distinctId) return null;
  const appHost = (import.meta.env.VITE_POSTHOG_APP_HOST as string | undefined) || "https://us.posthog.com";
  return `${appHost.replace(/\/$/, "")}/project/${projectId}/person/${encodeURIComponent(distinctId)}`;
};
