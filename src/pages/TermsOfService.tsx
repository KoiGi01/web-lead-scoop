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
                <p className="text-muted-foreground mb-10">Last updated: February 20, 2026</p>

                <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground leading-relaxed">

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
                        <p>By accessing or using GlobaLeads22 ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">2. Description of Service</h2>
                        <p>GlobaLeads22 is a lead generation tool that searches publicly available business information from Google Maps and the web, including business names, addresses, phone numbers, websites, and publicly listed email addresses.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">3. Acceptable Use</h2>
                        <p>You agree to use GlobaLeads22 only for lawful purposes. You must not:</p>
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                            <li>Use the Service to send unsolicited bulk emails (spam)</li>
                            <li>Violate any applicable laws or regulations, including GDPR and CAN-SPAM</li>
                            <li>Attempt to overload or disrupt the Service</li>
                            <li>Resell or redistribute access to the Service without permission</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">4. Account Responsibility</h2>
                        <p>You are responsible for maintaining the security of your account credentials. You are responsible for all activity that occurs under your account.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">5. Data Accuracy</h2>
                        <p>GlobaLeads22 aggregates publicly available data. We do not guarantee the accuracy, completeness, or currency of any lead data generated. Results are provided "as is" for informational purposes.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">6. Limitation of Liability</h2>
                        <p>To the maximum extent permitted by law, GlobaLeads22 shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service or the data generated.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">7. Changes to Terms</h2>
                        <p>We reserve the right to modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new Terms.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">8. Contact</h2>
                        <p>For questions about these Terms, contact us at: <a href="mailto:support@globaleads22.com" className="text-primary hover:underline">support@globaleads22.com</a></p>
                    </section>

                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
