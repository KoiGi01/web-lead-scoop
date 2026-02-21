import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="mx-auto max-w-3xl px-6 py-16">
                <Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back to GlobaLeads22
                </Link>

                <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
                <p className="text-muted-foreground mb-10">Last updated: February 20, 2026</p>

                <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground leading-relaxed">

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">1. Information We Collect</h2>
                        <p>When you create an account or sign in with Google, we collect your email address and name. When you use the lead generation tool, we process your search queries (business type and location) to generate results. We do not store or sell the lead data you generate.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
                        <p>We use your email address to authenticate your account and send important service notifications. We do not use your personal data for advertising or share it with third parties except as described below.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">3. Third-Party Services</h2>
                        <p>We use the following third-party services to operate GlobaLeads22:</p>
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                            <li><strong className="text-foreground">Supabase</strong> — authentication and database (supabase.com)</li>
                            <li><strong className="text-foreground">Google Maps API</strong> — business location data</li>
                            <li><strong className="text-foreground">Vercel</strong> — hosting and deployment</li>
                        </ul>
                        <p className="mt-2">Each service has its own privacy policy governing your data.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">4. Data Retention</h2>
                        <p>Your account data is retained as long as your account is active. You may request deletion of your account and associated data at any time by contacting us.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">5. Cookies</h2>
                        <p>We use essential cookies and localStorage to maintain your authentication session. No tracking or advertising cookies are used.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">6. Your Rights</h2>
                        <p>You have the right to access, correct, or delete your personal data at any time. To exercise these rights, contact us at the email below.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">7. Contact</h2>
                        <p>For privacy-related questions, contact us at: <a href="mailto:support@globaleads22.com" className="text-primary hover:underline">support@globaleads22.com</a></p>
                    </section>

                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
