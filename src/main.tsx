import { createRoot } from "react-dom/client";
import { PostHogProvider } from "@posthog/react";
import App from "./App.tsx";
import "./index.css";

const posthogKey = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN as string | undefined;
const posthogHost = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://us.i.posthog.com";

const root = createRoot(document.getElementById("root")!);

// Only wrap with PostHog when a key is configured, so local/preview builds
// without analytics env vars still run.
root.render(
  posthogKey ? (
    <PostHogProvider apiKey={posthogKey} options={{ api_host: posthogHost, defaults: "2025-05-24" }}>
      <App />
    </PostHogProvider>
  ) : (
    <App />
  ),
);
