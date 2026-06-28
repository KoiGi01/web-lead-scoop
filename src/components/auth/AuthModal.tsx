import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Mail } from "lucide-react";

interface AuthModalProps {
    open: boolean;
    onClose: () => void;
    redirectTo?: string;
}

type Mode = "signin" | "signup";

const getAuthRedirectUrl = () => {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        return `${window.location.origin}/app`;
    }

    return "https://app.globaleads22.com";
};

// Scoped styles that mirror the marketing landing's design system
// (light surface, Space Grotesk / Bricolage / IBM Plex Mono, yellow accent,
// signature offset hard-shadow on the primary button).
const AUTH_CSS = `
.gl-auth { font-family: 'Space Grotesk', sans-serif; }
.gl-auth-display { font-family: 'Bricolage Grotesque','Space Grotesk',sans-serif; }
.gl-auth-mono { font-family: 'IBM Plex Mono', monospace; }
.gl-auth-input { width:100%; height:48px; padding:0 14px; border:1px solid rgba(12,14,18,.12); border-radius:10px; background:#f7f8fa; color:#0b0c0e; font-size:15px; font-family:'Space Grotesk',sans-serif; outline:none; transition:border-color .15s, box-shadow .15s, background .15s; }
.gl-auth-input:focus { border-color:#e8fb52; box-shadow:0 0 0 3px rgba(232,251,82,.4); background:#fff; }
.gl-auth-input::placeholder { color:#9aa0a8; }
.gl-auth-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; width:100%; height:50px; background:#0b0c0e; color:#fff; border:none; border-radius:10px; font-family:'Space Grotesk',sans-serif; font-weight:600; font-size:15px; letter-spacing:-.01em; cursor:pointer; box-shadow:0 1px 0 rgba(21,20,15,.4), 4px 4px 0 #e8fb52; transition:transform .15s ease, box-shadow .15s ease; }
.gl-auth-btn:hover:not(:disabled){ transform:translate(2px,2px); box-shadow:0 1px 0 rgba(21,20,15,.4), 2px 2px 0 #e8fb52; }
.gl-auth-btn:disabled{ opacity:.55; cursor:not-allowed; }
.gl-auth-google { display:inline-flex; align-items:center; justify-content:center; gap:10px; width:100%; height:48px; background:#fff; color:#0b0c0e; border:1px solid rgba(12,14,18,.14); border-radius:10px; font-family:'Space Grotesk',sans-serif; font-weight:600; font-size:15px; cursor:pointer; transition:border-color .15s, background .15s; }
.gl-auth-google:hover:not(:disabled){ border-color:rgba(12,14,18,.32); background:#f7f8fa; }
.gl-auth-google:disabled{ opacity:.6; cursor:not-allowed; }
.gl-auth-link { font-weight:600; color:#0b0c0e; text-decoration:underline; text-decoration-color:#e8fb52; text-decoration-thickness:2px; text-underline-offset:2px; }
.gl-auth-link:hover { text-decoration-color:#0b0c0e; }
`;

const GoogleIcon = () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

const AuthModal = ({ open, onClose, redirectTo }: AuthModalProps) => {
    const [mode, setMode] = useState<Mode>("signin");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const reset = () => {
        setError("");
        setSuccess("");
        setEmail("");
        setPassword("");
    };

    const switchMode = (m: Mode) => {
        reset();
        setMode(m);
    };

    const handleEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            if (mode === "signup") {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: redirectTo || getAuthRedirectUrl(),
                    },
                });
                if (error) throw error;
                track("signup_completed", { method: "email" });
                setSuccess("Check your email for a confirmation link. Then sign in below.");
                setMode("signin");
                setPassword("");
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                onClose();
                reset();
                if (!redirectTo && !window.location.hostname.startsWith("app.")) {
                    window.location.replace(getAuthRedirectUrl());
                }
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        setGoogleLoading(true);
        setError("");
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: redirectTo || getAuthRedirectUrl(),
            },
        });
        if (error) {
            setError(error.message);
            setGoogleLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
            <DialogContent className="gl-auth overflow-hidden border border-[rgba(12,14,18,0.08)] bg-white p-0 text-[#0b0c0e] shadow-[0_30px_90px_-24px_rgba(12,14,18,0.45)] sm:max-w-md sm:rounded-2xl [&>button]:right-5 [&>button]:top-5 [&>button]:text-[#888d96] [&>button:hover]:text-[#0b0c0e]">
                <style>{AUTH_CSS}</style>
                <div className="h-1.5 w-full bg-[#e8fb52]" />

                <div className="p-7">
                    <DialogHeader className="mb-6 items-center text-center">
                        <div className="mb-4 flex items-center justify-center gap-3">
                            <img src="/logo.png" alt="GlobaLeads22 logo" className="h-11 w-11 rounded-lg" />
                            <div className="gl-auth-display text-2xl font-extrabold leading-none tracking-[-0.03em] text-[#0b0c0e]">
                                GlobaLeads<span className="gl-auth-mono align-super text-xs font-semibold tracking-normal text-[#0b0c0e]/55">22</span>
                            </div>
                        </div>
                        <DialogTitle className="gl-auth-display text-[26px] font-extrabold tracking-[-0.03em] text-[#0b0c0e]">
                            {mode === "signin" ? (
                                <>Welcome <span className="rounded bg-[#e8fb52] px-1.5 py-0.5 text-[#0b0c0e]">back</span></>
                            ) : (
                                <>Create your <span className="rounded bg-[#e8fb52] px-1.5 py-0.5 text-[#0b0c0e]">account</span></>
                            )}
                        </DialogTitle>
                        <DialogDescription className="mt-2.5 max-w-xs text-center text-sm leading-6 text-[#565b63]">
                            {mode === "signin"
                                ? "Sign in to lock in your prediction and manage your leads."
                                : "Free account — get started in seconds."}
                        </DialogDescription>
                    </DialogHeader>

                    <button type="button" className="gl-auth-google mb-4" onClick={handleGoogle} disabled={googleLoading || loading}>
                        {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                        Continue with Google
                    </button>

                    <div className="relative mb-4">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-[rgba(12,14,18,0.1)]" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="gl-auth-mono bg-white px-3 text-[11px] uppercase tracking-[0.14em] text-[#888d96]">or continue with email</span>
                        </div>
                    </div>

                    <form onSubmit={handleEmail} className="space-y-4">
                        <div className="space-y-1.5">
                            <label htmlFor="auth-email" className="gl-auth-mono block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#565b63]">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#888d96]" />
                                <input
                                    id="auth-email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="gl-auth-input"
                                    style={{ paddingLeft: 40 }}
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="auth-password" className="gl-auth-mono block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#565b63]">Password</label>
                            <input
                                id="auth-password"
                                type="password"
                                placeholder={mode === "signup" ? "Min. 8 characters" : "Your password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="gl-auth-input"
                                required
                                disabled={loading}
                                minLength={mode === "signup" ? 8 : undefined}
                            />
                        </div>

                        {error && (
                            <p className="rounded-lg bg-[#fdecea] px-3 py-2 text-sm text-[#b42318]">{error}</p>
                        )}
                        {success && (
                            <p className="rounded-lg bg-[#e7f6ec] px-3 py-2 text-sm text-[#067647]">{success}</p>
                        )}

                        <button type="submit" className="gl-auth-btn" disabled={loading || googleLoading}>
                            {loading ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Please wait…</>
                            ) : mode === "signin" ? "Sign in" : "Create account"}
                        </button>
                    </form>

                    <p className="mt-5 text-center text-sm text-[#565b63]">
                        {mode === "signin" ? (
                            <>Don&apos;t have an account?{" "}
                                <button type="button" onClick={() => switchMode("signup")} className="gl-auth-link">
                                    Sign up free
                                </button>
                            </>
                        ) : (
                            <>Already have an account?{" "}
                                <button type="button" onClick={() => switchMode("signin")} className="gl-auth-link">
                                    Sign in
                                </button>
                            </>
                        )}
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AuthModal;
