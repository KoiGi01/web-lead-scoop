import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const [pendingBundle, setPendingBundle] = useState<string | null>(null);

  const handlePricingClick = (bundleKey: string | null) => {
    if (bundleKey === "demo") {
      // Demo - redirect to app with demo flag
      navigate("/app?demo=true");
    } else if (!bundleKey) {
      // This case shouldn't happen anymore, but keep as fallback
      navigate("/app");
    } else {
      // Paid bundle - store it and redirect to app where checkout will be triggered
      setPendingBundle(bundleKey);
      navigate(`/app?bundle=${bundleKey}`);
    }
  };

  const goToApp = () => navigate("/app");

  const openAuth = () => navigate("/app");

  return (
    <div className="min-h-screen bg-[#030304]">
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
