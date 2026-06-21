import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import {
  buildOnboardingProfile,
  emptyOnboardingSlots,
  normalizeOnboardingSlots,
  type OnboardingSlots,
} from "@/lib/onboardingProfile";
import { track } from "@/lib/analytics";

export type OnboardingChatMessage = {
  id: string;
  role: "user" | "model";
  content: string;
};

interface UseOnboardingChatOptions {
  userId: string;
  onComplete: () => void | Promise<void>;
  onFallback: (slots: OnboardingSlots) => void;
}

const initialMessage: OnboardingChatMessage = {
  id: "setup-greeting",
  role: "model",
  content: "Let's set up your prospecting workspace. What do you sell, and who is it for?",
};

const makeMessage = (role: OnboardingChatMessage["role"], content: string): OnboardingChatMessage => ({
  id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  role,
  content,
});

const slotProgress = (slots: OnboardingSlots) => [
  slots.offer,
  slots.market,
  slots.problem,
  slots.emailAsk,
  slots.fullName && slots.companyName,
].filter(Boolean).length;

const hasAllRequiredSlots = (slots: OnboardingSlots) => slotProgress(slots) === 5;

export function useOnboardingChat({ userId, onComplete, onFallback }: UseOnboardingChatOptions) {
  const [messages, setMessages] = useState<OnboardingChatMessage[]>([initialMessage]);
  const [slots, setSlots] = useState<OnboardingSlots>(() => emptyOnboardingSlots());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const skippedRef = useRef(false);

  useEffect(() => {
    const loadAuthDefaults = async () => {
      const { data } = await supabase.auth.getUser();
      const metadata = data.user?.user_metadata || {};
      const name =
        metadata.full_name ||
        metadata.name ||
        [metadata.given_name, metadata.family_name].filter(Boolean).join(" ");

      setSlots((current) => ({
        ...current,
        fullName: current.fullName || (typeof name === "string" ? name.trim() : ""),
        companyName: current.companyName || (typeof metadata.company_name === "string" ? metadata.company_name.trim() : ""),
      }));
    };
    void loadAuthDefaults();
  }, []);

  const progress = useMemo(() => slotProgress(slots), [slots]);

  const saveProfile = useCallback(async (saveSlots: OnboardingSlots, skip: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const profile = buildOnboardingProfile(userId, saveSlots, { skip });
      const { error: insertError } = await supabase.from("user_profiles").upsert(profile);
      if (insertError) throw insertError;
      track("onboarding_completed", { skipped: skip });
      await onComplete();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save your setup.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [onComplete, userId]);

  const invokeTurn = useCallback(async (turnMessages: OnboardingChatMessage[], currentSlots: OnboardingSlots) => {
    const { data, error: invokeError } = await supabase.functions.invoke("onboarding-chat", {
      body: {
        userId,
        messages: turnMessages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        slots: currentSlots,
      },
    });

    if (invokeError) throw invokeError;
    if (!data?.assistant_message || !data?.slots || typeof data.done !== "boolean") {
      throw new Error("Setup chat returned an invalid response.");
    }

    return {
      assistantMessage: String(data.assistant_message),
      slots: normalizeOnboardingSlots(data.slots),
      done: Boolean(data.done),
    };
  }, [userId]);

  const triggerFallback = useCallback((fallbackSlots: OnboardingSlots) => {
    track("onboarding_chat_fallback");
    onFallback(fallbackSlots);
  }, [onFallback]);

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || loading || saving) return;

    const userMessage = makeMessage("user", trimmed);
    const turnMessages = [...messages, userMessage];
    setMessages(turnMessages);
    setLoading(true);
    setError(null);

    let fallbackSlots = slots;

    try {
      let result;
      try {
        result = await invokeTurn(turnMessages, slots);
      } catch (firstError) {
        if (retryCount > 0) throw firstError;
        setRetryCount(1);
        result = await invokeTurn(turnMessages, slots);
      }

      setRetryCount(0);
      if (skippedRef.current) return;
      fallbackSlots = result.slots;
      setSlots(result.slots);
      setMessages((current) => [...current, makeMessage("model", result.assistantMessage)]);

      if (result.done) {
        if (!hasAllRequiredSlots(result.slots)) {
          throw new Error("Setup needs the form fallback.");
        }
        await saveProfile(result.slots, false);
      }
    } catch {
      if (!skippedRef.current) triggerFallback(fallbackSlots);
    } finally {
      setLoading(false);
    }
  }, [invokeTurn, loading, messages, retryCount, saveProfile, saving, slots, triggerFallback]);

  const skip = useCallback(async () => {
    skippedRef.current = true;
    const saved = await saveProfile(slots, true);
    if (!saved) skippedRef.current = false;
  }, [saveProfile, slots]);

  return {
    messages,
    slots,
    progress,
    loading,
    saving,
    error,
    sendMessage,
    skip,
  };
}
