import { useCallback, useState } from "react";

import { OnboardingChat } from "@/components/onboarding/OnboardingChat";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import { useOnboardingChat } from "@/components/onboarding/useOnboardingChat";
import { emptyOnboardingSlots, type OnboardingSlots } from "@/lib/onboardingProfile";

interface OnboardingProps {
  open: boolean;
  onClose: () => void | Promise<void>;
  userId: string;
}

export function Onboarding({ open, onClose, userId }: OnboardingProps) {
  const [fallback, setFallback] = useState(false);
  const [fallbackSlots, setFallbackSlots] = useState<OnboardingSlots>(() => emptyOnboardingSlots());

  const handleFallback = useCallback((slots: OnboardingSlots) => {
    setFallbackSlots(slots);
    setFallback(true);
  }, []);

  const chat = useOnboardingChat({
    userId,
    onComplete: onClose,
    onFallback: handleFallback,
  });

  if (!open) return null;

  if (fallback) {
    return (
      <OnboardingModal
        open={open}
        onClose={onClose}
        userId={userId}
        initialSlots={fallbackSlots}
      />
    );
  }

  return (
    <OnboardingChat
      messages={chat.messages}
      progress={chat.progress}
      loading={chat.loading}
      saving={chat.saving}
      error={chat.error}
      onSend={chat.sendMessage}
      onSkip={chat.skip}
    />
  );
}

export default Onboarding;
