import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TermsOfService = () => {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="mx-auto max-w-3xl px-6 py-16">
                <Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back to GlobaLeads22
                </Link>

                <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
                <p className="text-muted-foreground mb-10">Last updated: April 28, 2026</p>

                <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground leading-relaxed">

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
                        <p>By accessing or using GlobaLeads22 ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">2. Description of Service</h2>
                        <p>GlobaLeads22 is a lead generation tool that searches publicly available business information from Google Maps and the web, including business names, addresses, phone numbers, websites, and publicly listed email addresses. The Service also provides AI-powered lead scoring and outreach suggestions.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">3. Acceptable Use</h2>
                        <p>You agree to use GlobaLeads22 only for lawful purposes. You must not:</p>
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                            <li>Use the Service to send unsolicited bulk emails (spam)</li>
                            <li>Violate any applicable laws or regulations, including GDPR, CAN-SPAM, and CASL</li>
                            <li>Attempt to overload, disrupt, or circumvent the Service</li>
                            <li>Resell or redistribute access to the Service without written permission</li>
                            <li>Use the Service to collect data on individuals for purposes other than legitimate B2B outreach</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">4. Account Responsibility</h2>
                        <p>You are responsible for maintaining the security of your account credentials and for all activity that occurs under your account. Notify us immediately at support@globaleads22.com if you suspect unauthorized access.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">5. Credits and Payments</h2>
                        <p>The Service operates on a credit system. Credits are purchased as one-time payments — there are no automatic renewals or subscriptions. Credits do not expire. All payments are processed by Stripe and are subject to their terms at stripe.com/legal.</p>
                        <p className="mt-2">Credits are non-refundable once purchased, except where required by applicable law. If a search fails due to a technical error on our side, credits will be restored to your account. Contact support@globaleads22.com within 14 days of a failed search to request a credit restore.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">6. Data Accuracy and Disclaimer</h2>
                        <p>GlobaLeads22 aggregates publicly available data from Google Maps and third-party websites. We do not guarantee the accuracy, completeness, or currency of any lead data generated. Business contact details may be outdated or incorrect. Results are provided "as is" for informational purposes only.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">7. Data Scraping Compliance</h2>
                        <p>The Service accesses publicly available business information. We respect website robots.txt directives and rate limits. You are responsible for ensuring your use of lead data complies with the laws and regulations of your jurisdiction, including but not limited to GDPR, CAN-SPAM, CASL, and any local data protection laws. We are not responsible for how you use or contact the leads generated.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">8. User Responsibility for Local Laws</h2>
                        <p>Cold outreach laws vary by country and region. You are solely responsible for ensuring that your outreach activities comply with the laws applicable in your jurisdiction and the jurisdiction of your recipients. GlobaLeads22 does not provide legal advice. When in doubt, consult a legal professional in your region.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">9. Limitation of Liability</h2>
                        <p>To the maximum extent permitted by law, GlobaLeads22 and its operators shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, the data generated, or your outreach activities. Our total liability for any claim shall not exceed the amount you paid us in the 30 days preceding the claim.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">10. Intellectual Property</h2>
                        <p>The Service, its design, and underlying technology are owned by GlobaLeads22. Lead data generated through your searches is yours to use for lawful purposes. You may not reverse-engineer or copy the Service.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">11. Termination</h2>
                        <p>We reserve the right to suspend or terminate accounts that violate these Terms. Unused credits at time of termination for cause are not refundable.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">12. Changes to Terms</h2>
                        <p>We reserve the right to modify these Terms at any time. We will notify you of material changes via email or an in-app notice. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">13. Contact</h2>
                        <p>For questions about these Terms, contact us at: <a href="mailto:support@globaleads22.com" className="text-primary hover:underline">support@globaleads22.com</a></p>
                    </section>

                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
