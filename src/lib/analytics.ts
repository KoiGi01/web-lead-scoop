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
