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
    isDemo?: boolean;
}

type Mode = "signin" | "signup" | "demo";

const AuthModal = ({ open, onClose, isDemo = false }: AuthModalProps) => {
    const [mode, setMode] = useState<Mode>(isDemo ? "demo" : "signin");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [demoEmail, setDemoEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const reset = () => {
        setError("");
        setSuccess("");
        setEmail("");
        setPassword("");
        setDemoEmail("");
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
                        emailRedirectTo: window.location.hostname.startsWith("app.") ? window.location.origin : `${window.location.origin}/app`,
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
                if (!window.location.hostname.startsWith("app.")) {
                    window.location.href = "https://app.globaleads22.com";
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
                redirectTo: window.location.hostname.startsWith("app.") ? window.location.origin : `${window.location.origin}/app`,
            },
        });
        if (error) {
            setError(error.message);
            setGoogleLoading(false);
        }
        // On success, browser redirects — no need to do anything else
    };

    const handleDemoSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!demoEmail.trim()) {
            setError("Please enter an email to start the demo");
            return;
        }

        setError("");
        setLoading(true);

        try {
            // Create a temporary demo account
            const { data, error } = await supabase.auth.signUp({
                email: demoEmail,
                password: Math.random().toString(36).slice(-12), // Random password
                options: {
                    emailRedirectTo: `${window.location.origin}/app`,
                },
            });

            if (error) throw error;

            if (data.user) {
                // Add 30 demo credits to user_credits table (ignore if already exists)
                const { error: creditsError } = await supabase
                    .from('user_credits')
                    .insert({
                        user_id: data.user.id,
                        balance: 30,
                        plan: 'demo',
                    });

                if (creditsError && creditsError.code !== '23505') throw creditsError;

                setSuccess("Demo account created! Check your email to confirm. You have 30 credits for 1 search.");
                setTimeout(() => {
                    onClose();
                    reset();
                }, 2000);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to create demo account");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden border border-cream-100/10 bg-petrol-800">
                {/* Header gradient band */}
                <div className="h-1.5 w-full bg-gradient-to-r from-wine-700 to-wine-500" />

                <div className="p-6">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-xl font-heading font-bold text-cream-100 text-center">
                            {mode === "demo" ? (
                                <>Try the <span className="text-wine-500">demo</span></>
                            ) : mode === "signin" ? (
                                <>Welcome <span className="text-wine-500">back</span></>
                            ) : (
                                <>Create your <span className="text-wine-500">account</span></>
                            )}
                        </DialogTitle>
                        <p className="text-sm text-cream-300 text-center mt-1">
                            {mode === "demo"
                                ? "Enter your email for 30 demo credits (1 search)"
                                : mode === "signin"
                                ? "Sign in to generate and download leads"
                                : "Free account — start generating leads instantly"}
                        </p>
                    </DialogHeader>

                    {/* Demo form (only shown in demo mode) */}
                    {mode === "demo" && (
                        <form onSubmit={handleDemoSignup} className="space-y-4 mb-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="demo-email" className="text-sm text-cream-300 font-mono">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream-300" />
                                    <Input
                                        id="demo-email"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={demoEmail}
                                        onChange={(e) => setDemoEmail(e.target.value)}
                                        className="pl-9 bg-petrol-900/60 border-b-2 border-cream-100/20 focus:border-wine-700/60 text-cream-100 placeholder:text-cream-100/30"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            {error && (
                                <p className="text-sm text-orange-400 bg-orange-500/10 rounded-lg px-3 py-2">{error}</p>
                            )}
                            {success && (
                                <p className="text-sm text-emerald-400 bg-emerald-500/10 rounded-lg px-3 py-2">{success}</p>
                            )}

                            <Button variant="accent" className="w-full font-semibold" type="submit" disabled={loading}>
                                {loading ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting demo…</>
                                ) : (
                                    "Start Demo (30 Credits)"
                                )}
                            </Button>

                            <button
                                type="button"
                                onClick={() => switchMode("signin")}
                                className="w-full text-sm text-wine-500 font-medium hover:underline"
                            >
                                Already have an account? Sign in
                            </button>
                        </form>
                    )}

                    {mode !== "demo" && (
                        <>
                            {/* Google Button */}
                            <Button
                                variant="outline"
                                className="w-full mb-4 gap-2 font-medium bg-cream-100/10 border-cream-100/20 text-cream-100 hover:bg-cream-100/20"
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
                                    <span className="w-full border-t border-cream-100/10" />
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="bg-petrol-800 px-3 text-cream-300">or continue with email</span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Email form (only for signin/signup mode) */}
                    {mode !== "demo" && (
                    <form onSubmit={handleEmail} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="auth-email" className="text-sm text-cream-300 font-mono">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream-300" />
                                <Input
                                    id="auth-email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-9 bg-petrol-900/60 border-b-2 border-cream-100/20 focus:border-wine-700/60 text-cream-100 placeholder:text-cream-100/30"
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="auth-password" className="text-sm text-cream-300 font-mono">Password</Label>
                            <Input
                                id="auth-password"
                                type="password"
                                placeholder={mode === "signup" ? "Min. 8 characters" : "Your password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-petrol-900/60 border-b-2 border-cream-100/20 focus:border-wine-700/60 text-cream-100 placeholder:text-cream-100/30"
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

                        <Button variant="accent" className="w-full font-semibold" type="submit" disabled={loading || googleLoading}>
                            {loading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait…</>
                            ) : mode === "signin" ? "Sign In" : "Create Account"}
                        </Button>
                    </form>
                    )}

                    {/* Mode toggle */}
                    {mode !== "demo" && (
                    <p className="mt-5 text-center text-sm text-cream-300">
                        {mode === "signin" ? (
                            <>Don't have an account?{" "}
                                <button onClick={() => switchMode("signup")} className="text-wine-500 font-medium hover:underline">
                                    Sign up free
                                </button>
                            </>
                        ) : (
                            <>Already have an account?{" "}
                                <button onClick={() => switchMode("signin")} className="text-wine-500 font-medium hover:underline">
                                    Sign in
                                </button>
                            </>
                        )}
                    </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AuthModal;
