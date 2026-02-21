import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Mail, Chrome } from "lucide-react";

interface AuthModalProps {
    open: boolean;
    onClose: () => void;
}

type Mode = "signin" | "signup";

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
                        emailRedirectTo: window.location.origin,
                    },
                });
                if (error) throw error;
                setSuccess("Check your email for a confirmation link! Then sign in below.");
                setMode("signin");
                setPassword("");
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                onClose();
                reset();
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
                redirectTo: window.location.origin,
            },
        });
        if (error) {
            setError(error.message);
            setGoogleLoading(false);
        }
        // On success, browser redirects — no need to do anything else
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden border border-white/10 bg-[#0F1115]">
                {/* Header gradient band */}
                <div className="h-1.5 w-full bg-gradient-to-r from-[#EA580C] to-[#F7931A]" />

                <div className="p-6">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-xl font-heading font-bold text-white text-center">
                            {mode === "signin" ? (
                                <>Welcome <span className="text-[#F7931A]">back</span></>
                            ) : (
                                <>Create your <span className="text-[#F7931A]">account</span></>
                            )}
                        </DialogTitle>
                        <p className="text-sm text-[#94A3B8] text-center mt-1">
                            {mode === "signin"
                                ? "Sign in to generate and download leads"
                                : "Free account — start generating leads instantly"}
                        </p>
                    </DialogHeader>

                    {/* Google Button */}
                    <Button
                        variant="outline"
                        className="w-full mb-4 gap-2 font-medium bg-white/10 border-white/20 text-white hover:bg-white/20"
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

                    {/* Divider */}
                    <div className="relative mb-4">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="bg-[#0F1115] px-3 text-[#94A3B8]">or continue with email</span>
                        </div>
                    </div>

                    {/* Email form */}
                    <form onSubmit={handleEmail} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="auth-email" className="text-sm text-[#94A3B8] font-mono">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                                <Input
                                    id="auth-email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-9 bg-black/50 border-b-2 border-white/20 focus:border-[#F7931A] text-white placeholder:text-white/30"
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="auth-password" className="text-sm text-[#94A3B8] font-mono">Password</Label>
                            <Input
                                id="auth-password"
                                type="password"
                                placeholder={mode === "signup" ? "Min. 8 characters" : "Your password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-black/50 border-b-2 border-white/20 focus:border-[#F7931A] text-white placeholder:text-white/30"
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

                        <button type="submit" className="btn-btc w-full font-semibold" disabled={loading || googleLoading}>
                            {loading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait…</>
                            ) : mode === "signin" ? "Sign In" : "Create Account"}
                        </button>
                    </form>

                    {/* Mode toggle */}
                    <p className="mt-5 text-center text-sm text-[#94A3B8]">
                        {mode === "signin" ? (
                            <>Don't have an account?{" "}
                                <button onClick={() => switchMode("signup")} className="text-[#F7931A] font-medium hover:underline">
                                    Sign up free
                                </button>
                            </>
                        ) : (
                            <>Already have an account?{" "}
                                <button onClick={() => switchMode("signin")} className="text-[#F7931A] font-medium hover:underline">
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
