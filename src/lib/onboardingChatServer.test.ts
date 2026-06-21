import { describe, expect, it } from "vitest";

import {
  calculateGeminiCost,
  emptySlots,
  enforceBounds,
  followUpUsedForActiveStep,
  mergeSlots,
  shouldForceDone,
  type ChatMessage,
} from "../../supabase/functions/onboarding-chat/helpers";

describe("onboarding-chat helpers", () => {
  it("merges slots additively without clobbering filled values", () => {
    expect(mergeSlots(
      { ...emptySlots(), offer: "Web design", market: "Miami" },
      { offer: "SEO", problem: "Low bookings" },
    )).toEqual({
      offer: "Web design",
      market: "Miami",
      problem: "Low bookings",
      emailAsk: "",
      fullName: "",
      companyName: "",
    });
  });

  it("detects when the active slot already used its one follow-up", () => {
    const messages: ChatMessage[] = [
      { role: "model", content: "What do you sell?" },
      { role: "user", content: "services" },
      { role: "model", content: "What kind of services?" },
      { role: "user", content: "websites for clinics" },
    ];

    expect(followUpUsedForActiveStep(messages, emptySlots())).toBe(true);
  });

  it("forces done at the 12-turn cap", () => {
    const messages = Array.from({ length: 12 }, (_, index) => ({
      role: "user" as const,
      content: `turn ${index + 1}`,
    }));

    expect(shouldForceDone(messages)).toBe(true);
    expect(enforceBounds(messages, emptySlots(), {}, false).done).toBe(true);
  });

  it("calculates cost from Gemini usage metadata", () => {
    expect(calculateGeminiCost(
      { promptTokenCount: 1000, candidatesTokenCount: 500, totalTokenCount: 1500 },
      0.3,
      2.5,
    )).toEqual({
      promptTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
      estimatedCostUsd: 0.00155,
    });
  });
});
