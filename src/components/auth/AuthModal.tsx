import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Mail } from "lucide-react";

interface AuthModalProps {
    open: boolean;
    onClose: () => void;
}

type Mode = "signin" | "signup";

const getAuthRedirectUrl = () => {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        return `${window.location.origin}/app`;
    }

    return "https://app.globaleads22.com";
};

const AuthModal = ({ open, onClose }: AuthModalProps) => {
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
                        emailRedirectTo: getAuthRedirectUrl(),
                    },
                });
                if (error) throw error;
                setSuccess("Check your email for a confirmation link. Then sign in below.");
                setMode("signin");
                setPassword("");
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                onClose();
                reset();
                if (!window.location.hostname.startsWith("app.")) {
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
                redirectTo: getAuthRedirectUrl(),
            },
        });
        if (error) {
            setError(error.message);
            setGoogleLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
            <DialogContent className="overflow-hidden border border-[#e8fb52]/35 bg-[#030303] p-0 text-[#f3f5f8] shadow-[0_0_90px_rgba(245,255,61,0.14)] sm:max-w-md sm:rounded-none [&>button]:right-5 [&>button]:top-5 [&>button]:rounded-none [&>button]:text-[#f3f5f8]/55 [&>button]:ring-offset-black [&>button:hover]:text-[#e8fb52]">
                <div className="h-1 w-full bg-[#e8fb52]" />

                <div className="relative bg-[#030303] p-6">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,255,61,0.12),transparent_42%)]" />
                    <div className="relative">
                    <DialogHeader className="mb-6 items-center text-center">
                        <div className="mb-4 flex items-center justify-center gap-3">
                            <img src="/logo.png" alt="GlobaLeads22 logo" className="h-12 w-12 rounded-lg" />
                            <div className="text-left font-heading text-2xl font-black leading-none tracking-[-0.05em] text-[#f3f5f8]">
                                GlobaLeads<span className="align-super font-mono text-xs tracking-normal text-[#e8fb52]">22</span>
                            </div>
                        </div>
                        <DialogTitle className="text-center font-heading text-2xl font-black tracking-[-0.035em] text-[#f3f5f8]">
                            {mode === "signin" ? (
                                <>Welcome <span className="text-[#e8fb52]">back</span></>
                            ) : (
                                <>Create your <span className="text-[#e8fb52]">account</span></>
                            )}
                        </DialogTitle>
                        <DialogDescription className="mt-2 max-w-xs text-center text-sm leading-6 text-[#9aa3b2]">
                            {mode === "signin"
                                ? "Sign in to generate and download leads"
                                : "Free account - start generating leads instantly"}
                        </DialogDescription>
                    </DialogHeader>

                    <Button
                        variant="outline"
                        className="mb-4 h-12 w-full gap-2 rounded-none border-[#f3f5f8]/15 bg-[#161922] font-semibold text-[#f3f5f8] hover:border-[#e8fb52]/50 hover:bg-[#181810] hover:text-[#e8fb52]"
                        onClick={handleGoogle}
                        disabled={googleLoading || loading}
                    >
                        {googleLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <svg className="h-4 w-4" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                        )}
                        Continue with Google
                    </Button>

                    <div className="relative mb-4">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-[#f3f5f8]/12" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="bg-black px-3 font-mono uppercase tracking-[0.12em] text-[#5d6675]">or continue with email</span>
                        </div>
                    </div>

                    <form onSubmit={handleEmail} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="auth-email" className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#e8fb52]">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa3b2]" />
                                <Input
                                    id="auth-email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-12 rounded-none border-[#f3f5f8]/15 bg-[#0d0f13] pl-9 text-[#f3f5f8] placeholder:text-[#5d6675] focus-visible:border-[#e8fb52] focus-visible:ring-[#e8fb52]/25"
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="auth-password" className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#e8fb52]">Password</Label>
                            <Input
                                id="auth-password"
                                type="password"
                                placeholder={mode === "signup" ? "Min. 8 characters" : "Your password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-12 rounded-none border-[#f3f5f8]/15 bg-[#0d0f13] text-[#f3f5f8] placeholder:text-[#5d6675] focus-visible:border-[#e8fb52] focus-visible:ring-[#e8fb52]/25"
                                required
                                disabled={loading}
                                minLength={mode === "signup" ? 8 : undefined}
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-orange-400 bg-orange-500/10 rounded-lg px-3 py-2">{error}</p>
                        )}
                        {success && (
                            <p className="text-sm text-emerald-400 bg-emerald-500/10 rounded-lg px-3 py-2">{success}</p>
                        )}

                        <Button className="h-12 w-full rounded-none border border-[#e8fb52] bg-[#e8fb52] font-mono font-black uppercase tracking-[0.1em] text-black hover:bg-[#f3ff8a] hover:text-black" type="submit" disabled={loading || googleLoading}>
                            {loading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait...</>
                            ) : mode === "signin" ? "Sign In" : "Create Account"}
                        </Button>
                    </form>

                    <p className="mt-5 text-center text-sm text-[#9aa3b2]">
                        {mode === "signin" ? (
                            <>Don't have an account?{" "}
                                <button onClick={() => switchMode("signup")} className="font-semibold text-[#e8fb52] hover:underline">
                                    Sign up free
                                </button>
                            </>
                        ) : (
                            <>Already have an account?{" "}
                                <button onClick={() => switchMode("signin")} className="font-semibold text-[#e8fb52] hover:underline">
                                    Sign in
                                </button>
                            </>
                        )}
                    </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AuthModal;
