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
                <p className="text-muted-foreground mb-10">Last updated: April 28, 2026</p>

                <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground leading-relaxed">

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">1. Information We Collect</h2>
                        <p>When you create an account or sign in with Google, we collect your email address and name. When you use the lead generation tool, we process your search queries (business type and location) to generate results. We store your search history and saved leads so you can access them across sessions. We do not sell your personal data or the lead data you generate.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
                        <p>We use your email address to authenticate your account, send important service notifications, and process payments. We use your search history to show you past searches in the app sidebar. We do not use your personal data for advertising.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">3. Third-Party Services</h2>
                        <p>We use the following third-party services to operate GlobaLeads22:</p>
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                            <li><strong className="text-foreground">Supabase</strong> — authentication and database (supabase.com)</li>
                            <li><strong className="text-foreground">Stripe</strong> — payment processing. When you purchase credits, your payment information is collected and processed directly by Stripe. We do not store your card details. Stripe's privacy policy is available at stripe.com/privacy.</li>
                            <li><strong className="text-foreground">Google Maps API</strong> — business location and contact data</li>
                            <li><strong className="text-foreground">Firecrawl</strong> — website scraping to extract publicly listed contact information</li>
                            <li><strong className="text-foreground">Anthropic</strong> — AI-powered lead scoring and pitch generation. Only anonymised business data (not your personal data) is sent to Anthropic for analysis.</li>
                            <li><strong className="text-foreground">Vercel</strong> — hosting and deployment</li>
                        </ul>
                        <p className="mt-2">Each service has its own privacy policy governing how they handle data.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">4. Payments and Billing</h2>
                        <p>Credit purchases are one-time payments processed by Stripe. We do not store payment card information. We retain billing records (amount, date, Stripe customer ID) for tax and accounting purposes. Credits do not expire.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">5. Data Retention</h2>
                        <p>Your account data, search history, and saved leads are retained as long as your account is active. Billing records are retained for 7 years as required by applicable tax law. You may request deletion of your account and associated data at any time by emailing <a href="mailto:support@globaleads22.com" className="text-primary hover:underline">support@globaleads22.com</a>. Billing records required by law are exempt from deletion requests.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">6. Cookies</h2>
                        <p>We use essential cookies and localStorage to maintain your authentication session. No tracking, analytics, or advertising cookies are used. You may decline non-essential cookies via the banner shown on first visit; this will not affect the core functionality of the app.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">7. Your Rights (GDPR / CCPA)</h2>
                        <p>Depending on your location, you may have the right to:</p>
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                            <li>Access the personal data we hold about you</li>
                            <li>Correct inaccurate personal data</li>
                            <li>Request deletion of your personal data ("right to be forgotten")</li>
                            <li>Object to or restrict certain processing of your data</li>
                            <li>Receive a copy of your data in a portable format</li>
                        </ul>
                        <p className="mt-2">To exercise any of these rights, contact us at <a href="mailto:support@globaleads22.com" className="text-primary hover:underline">support@globaleads22.com</a>. We will respond within 30 days.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">8. Security</h2>
                        <p>All data is transmitted over HTTPS. Data at rest is encrypted by Supabase. Access to your data is restricted to your account via Row-Level Security policies — other users cannot access your searches or leads.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">9. Contact</h2>
                        <p>For privacy-related questions or data requests, contact us at: <a href="mailto:support@globaleads22.com" className="text-primary hover:underline">support@globaleads22.com</a></p>
                    </section>

                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
