export type ChatRole = "user" | "model";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type OnboardingSlots = {
  offer: string;
  market: string;
  problem: string;
  emailAsk: string;
  fullName: string;
  companyName: string;
};

export type GeminiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};

export const TURN_CAP = 12;
export const SLOT_ORDER = ["offer", "market", "problem", "emailAsk", "sender"] as const;
export const CONVERSATION_STEP_ORDER = ["fullName", "offer", "market", "problem", "emailAsk", "companyName"] as const;

export const emptySlots = (): OnboardingSlots => ({
  offer: "",
  market: "",
  problem: "",
  emailAsk: "",
  fullName: "",
  companyName: "",
});

const clean = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";

export function normalizeSlots(value: unknown): OnboardingSlots {
  const record = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    offer: clean(record.offer, 500),
    market: clean(record.market, 200),
    problem: clean(record.problem, 500),
    emailAsk: clean(record.emailAsk, 400),
    fullName: clean(record.fullName, 160),
    companyName: clean(record.companyName, 160),
  };
}

export function mergeSlots(current: OnboardingSlots, next: Partial<OnboardingSlots>): OnboardingSlots {
  const normalized = normalizeSlots(next);
  return {
    offer: current.offer || normalized.offer,
    market: current.market || normalized.market,
    problem: current.problem || normalized.problem,
    emailAsk: current.emailAsk || normalized.emailAsk,
    fullName: current.fullName || normalized.fullName,
    companyName: current.companyName || normalized.companyName,
  };
}

export function filledStepCount(slots: OnboardingSlots) {
  return [
    Boolean(slots.offer),
    Boolean(slots.market),
    Boolean(slots.problem),
    Boolean(slots.emailAsk),
    Boolean(slots.fullName && slots.companyName),
  ].filter(Boolean).length;
}

export function activeStep(slots: OnboardingSlots): typeof CONVERSATION_STEP_ORDER[number] | null {
  if (!slots.fullName) return "fullName";
  if (!slots.offer) return "offer";
  if (!slots.market) return "market";
  if (!slots.problem) return "problem";
  if (!slots.emailAsk) return "emailAsk";
  if (!slots.companyName) return "companyName";
  return null;
}

export function completedConversationStepCount(slots: OnboardingSlots) {
  return [
    Boolean(slots.fullName),
    Boolean(slots.offer),
    Boolean(slots.market),
    Boolean(slots.problem),
    Boolean(slots.emailAsk),
    Boolean(slots.companyName),
  ].filter(Boolean).length;
}

export function userTurnCount(messages: ChatMessage[]) {
  return messages.filter((message) => message.role === "user").length;
}

export function followUpUsedForActiveStep(messages: ChatMessage[], slots: OnboardingSlots) {
  const current = activeStep(slots);
  if (!current) return false;
  const userTurnsAfterPriorFilledSteps = userTurnCount(messages) - completedConversationStepCount(slots);
  return userTurnsAfterPriorFilledSteps >= 2;
}

export function allSlotsFilled(slots: OnboardingSlots) {
  return filledStepCount(slots) === SLOT_ORDER.length;
}

export function shouldForceDone(messages: ChatMessage[]) {
  return userTurnCount(messages) >= TURN_CAP;
}

export function nextQuestion(slots: OnboardingSlots) {
  const step = activeStep(slots);
  if (step === "fullName") return "Welcome to GlobaLeads22. What should I call you?";
  if (step === "offer") return "GlobaLeads22 helps find prospects with visible reasons to buy, organize them, and shape the first outreach angle. What do you sell, and who is it for?";
  if (step === "market") return "Where should we look for customers?";
  if (step === "problem") return "What problem do you solve for them?";
  if (step === "emailAsk") return "What should the first email ask them to do?";
  if (step === "companyName") return "What company should emails come from?";
  return "You're set. I'll save this and open your workspace.";
}

export function latestUserMessage(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user")?.content?.trim() || "";
}

export function enforceBounds(
  messages: ChatMessage[],
  incomingSlots: OnboardingSlots,
  modelSlots: Partial<OnboardingSlots>,
  modelDone: boolean,
) {
  let slots = mergeSlots(incomingSlots, modelSlots);

  if (followUpUsedForActiveStep(messages, slots)) {
    const current = activeStep(slots);
    const fallbackValue = clean(latestUserMessage(messages), current === "market" ? 200 : 500);
    if (fallbackValue) {
      if (current === "fullName") slots = { ...slots, fullName: clean(fallbackValue, 160) };
      if (current === "offer") slots = { ...slots, offer: fallbackValue };
      if (current === "market") slots = { ...slots, market: fallbackValue };
      if (current === "problem") slots = { ...slots, problem: fallbackValue };
      if (current === "emailAsk") slots = { ...slots, emailAsk: fallbackValue };
      if (current === "companyName") slots = { ...slots, companyName: clean(fallbackValue, 160) };
    }
  }

  const done = shouldForceDone(messages) || modelDone || allSlotsFilled(slots);
  return { slots, done };
}

export function calculateGeminiCost(
  usage: GeminiUsageMetadata | undefined,
  inputCostPerMillion: number,
  outputCostPerMillion: number,
) {
  const promptTokens = Math.max(0, Number(usage?.promptTokenCount || 0));
  const outputTokens = Math.max(0, Number(usage?.candidatesTokenCount || 0));
  return {
    promptTokens,
    outputTokens,
    totalTokens: Math.max(0, Number(usage?.totalTokenCount || promptTokens + outputTokens)),
    estimatedCostUsd: (promptTokens / 1_000_000) * inputCostPerMillion + (outputTokens / 1_000_000) * outputCostPerMillion,
  };
}
