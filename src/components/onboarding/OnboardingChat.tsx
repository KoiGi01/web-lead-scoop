import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { OnboardingChatMessage } from "@/components/onboarding/useOnboardingChat";

interface OnboardingChatProps {
  messages: OnboardingChatMessage[];
  progress: number;
  loading: boolean;
  saving: boolean;
  error: string | null;
  onSend: (content: string) => void;
  onSkip: () => void;
}

const useReducedMotion = () => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
};

const handleFieldFocus = (e: { currentTarget: HTMLElement }) => {
  const el = e.currentTarget;
  window.setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 250);
};

export function OnboardingChat({
  messages,
  progress,
  loading,
  saving,
  error,
  onSend,
  onSkip,
}: OnboardingChatProps) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (typeof list.scrollTo === "function") {
      list.scrollTo({ top: list.scrollHeight, behavior: reducedMotion ? "auto" : "smooth" });
      return;
    }
    list.scrollTop = list.scrollHeight;
  }, [messages, loading, reducedMotion]);

  useEffect(() => {
    const id = window.setTimeout(() => composerRef.current?.focus(), 300);
    return () => window.clearTimeout(id);
  }, []);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const value = draft.trim();
    if (!value || loading || saving) return;
    setDraft("");
    onSend(value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#08090c] text-[#f3f5f8]">
      <style>{`
        @keyframes glSpin { to { transform: rotate(405deg); } }
        @keyframes glRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glDot { 0%, 80%, 100% { opacity: .28; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-3px); } }
        .gl-chat-spin { animation: glSpin 60s linear infinite; transform-origin: center; }
        .gl-chat-rise { animation: glRise .32s cubic-bezier(.16,1,.3,1) both; }
        .gl-typing-dot { animation: glDot 1.1s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .gl-chat-spin, .gl-chat-rise, .gl-typing-dot { animation: none !important; }
        }
      `}</style>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-16vh] top-1/2 hidden h-[60vh] w-[60vh] -translate-y-1/2 lg:block"
      >
        <div className="gl-chat-spin h-full w-full border border-[#e8fb52]/[0.07]" />
        <div className="gl-chat-spin absolute inset-[14%] border border-[#e8fb52]/[0.05]" style={{ animationDuration: "90s", animationDirection: "reverse" }} />
      </div>

      <div className="relative flex h-[100dvh] flex-col">
        <header className="flex h-16 flex-shrink-0 items-center justify-between px-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="" aria-hidden="true" className="h-8 w-8 rounded-[6px] object-contain" />
            <p className="font-display text-[16px] font-extrabold">
              GlobaLeads<sup className="font-mono text-[8px] font-semibold text-[#e8fb52]">22</sup>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div aria-label={`${progress} of 5 setup steps complete`} className="flex gap-1.5">
              {Array.from({ length: 5 }, (_, index) => (
                <span
                  key={index}
                  className={`h-2 w-2 rounded-full transition-colors ${index < progress ? "bg-[#e8fb52]" : "bg-[#f3f5f8]/15"}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={onSkip}
              disabled={saving}
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b6472] transition-colors hover:text-[#f3f5f8] disabled:opacity-50"
            >
              Skip
            </button>
          </div>
        </header>

        <main className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col px-5 sm:px-8 lg:px-12">
          <div className="flex flex-shrink-0 items-baseline gap-3 pt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b6472]">
            <span className="text-[#e8fb52]">{String(Math.min(progress + 1, 5)).padStart(2, "0")}</span>
            <span className="text-[#3a414e]">/ 05</span>
            <span>Setup</span>
          </div>

          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto py-6 sm:py-8">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`gl-chat-rise flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[86%] rounded-lg px-4 py-3 text-sm leading-6 sm:max-w-[72%] ${
                      message.role === "user"
                        ? "bg-[#e8fb52] text-[#08090c]"
                        : "border border-[#f3f5f8]/10 bg-[#111319] text-[#f3f5f8]"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-lg border border-[#f3f5f8]/10 bg-[#111319] px-4 py-3 text-sm text-[#9aa3b2]">
                    {reducedMotion ? (
                      <span>typing...</span>
                    ) : (
                      <span className="flex h-6 items-center gap-1.5" aria-label="typing">
                        <span className="gl-typing-dot h-1.5 w-1.5 rounded-full bg-[#9aa3b2]" />
                        <span className="gl-typing-dot h-1.5 w-1.5 rounded-full bg-[#9aa3b2]" style={{ animationDelay: ".14s" }} />
                        <span className="gl-typing-dot h-1.5 w-1.5 rounded-full bg-[#9aa3b2]" style={{ animationDelay: ".28s" }} />
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="flex-shrink-0 pb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[#ff8a7c]">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="flex flex-shrink-0 items-end gap-3 pb-5">
            <textarea
              ref={composerRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              onFocus={handleFieldFocus}
              rows={2}
              disabled={loading || saving}
              placeholder="Type your answer..."
              className="min-h-[52px] flex-1 resize-none rounded-lg border border-[#f3f5f8]/10 bg-[#0f1115] px-4 py-3 text-sm leading-6 text-[#f3f5f8] outline-none placeholder:text-[#5b6472] focus:border-[#e8fb52]/70 disabled:opacity-60"
            />
            <Button
              type="submit"
              variant="accent"
              disabled={!draft.trim() || loading || saving}
              className="h-[52px] w-[52px] rounded-lg bg-[#e8fb52] p-0 text-[#08090c] hover:bg-[#f3ff8a]"
              aria-label="Send answer"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </Button>
          </form>
        </main>
      </div>
    </div>
  );
}
