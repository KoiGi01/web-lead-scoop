import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OnboardingChat } from "@/components/onboarding/OnboardingChat";

const messages = [
  { id: "m1", role: "model" as const, content: "What do you sell?" },
  { id: "m2", role: "user" as const, content: "Websites for clinics" },
];

describe("OnboardingChat", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the composer value on Enter and exposes progress", () => {
    const onSend = vi.fn();

    render(
      <OnboardingChat
        messages={messages}
        progress={2}
        loading={false}
        saving={false}
        error={null}
        onSend={onSend}
        onSkip={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("2 of 5 setup steps complete")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Type your answer..."), { target: { value: "Miami" } });
    fireEvent.keyDown(screen.getByPlaceholderText("Type your answer..."), { key: "Enter" });

    expect(onSend).toHaveBeenCalledWith("Miami");
  });

  it("keeps Skip available and shows static typing text for reduced motion", () => {
    const onSkip = vi.fn();
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));

    render(
      <OnboardingChat
        messages={messages}
        progress={2}
        loading
        saving={false}
        error={null}
        onSend={vi.fn()}
        onSkip={onSkip}
      />,
    );

    expect(screen.getByText("typing...")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onSkip).toHaveBeenCalled();
  });
});
