import { useState } from "react";
import NavBar from "@/components/landing/NavBar";
import HeroSection from "@/components/landing/HeroSection";
import StatsBar from "@/components/landing/StatsBar";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import UseCasesSection from "@/components/landing/UseCasesSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import PricingSection from "@/components/landing/PricingSection";
import FaqSection from "@/components/landing/FaqSection";
import FooterSection from "@/components/landing/FooterSection";

const Index = () => {
  const [pendingBundle, setPendingBundle] = useState<string | null>(null);

  const appUrl = window.location.hostname.startsWith("app.")
    ? window.location.origin
    : "https://app.globaleads22.com";

  const handlePricingClick = (bundleKey: string | null) => {
    if (bundleKey === "demo") {
      window.location.href = `${appUrl}?demo=true`;
    } else if (!bundleKey) {
      window.location.href = appUrl;
    } else {
      setPendingBundle(bundleKey);
      window.location.href = `${appUrl}?bundle=${bundleKey}`;
    }
  };

  const goToApp = () => { window.location.href = appUrl; };
  const openAuth = () => { window.location.href = appUrl; };

  return (
    <div className="min-h-screen" style={{ background: "#080808" }}>
      <NavBar onGetStarted={goToApp} onOpenAuth={openAuth} />
      <HeroSection onGetStarted={goToApp} />
      <StatsBar />
      <FeaturesSection />
      <HowItWorksSection />
      <UseCasesSection />
      <TestimonialsSection />
      <PricingSection onGetStarted={handlePricingClick} />
      <FaqSection />
      <FooterSection />
    </div>
  );
};

export default Index;
