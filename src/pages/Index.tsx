import { useRef, useState } from "react";
import NavBar from "@/components/landing/NavBar";
import HeroSection from "@/components/landing/HeroSection";
import StatsBar from "@/components/landing/StatsBar";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import UseCasesSection from "@/components/landing/UseCasesSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import LeadGeneratorSection from "@/components/landing/LeadGeneratorSection";
import PricingSection from "@/components/landing/PricingSection";
import FaqSection from "@/components/landing/FaqSection";
import FooterSection from "@/components/landing/FooterSection";
import AuthModal from "@/components/auth/AuthModal";

const Index = () => {
  const toolRef = useRef<HTMLDivElement>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const scrollToTool = () => {
    toolRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const openAuth = () => setAuthOpen(true);

  return (
    <div className="min-h-screen bg-background">
      <NavBar onGetStarted={scrollToTool} onOpenAuth={openAuth} />
      <HeroSection onGetStarted={scrollToTool} />
      <StatsBar />
      <FeaturesSection />
      <HowItWorksSection />
      <UseCasesSection />
      <TestimonialsSection />
      <div ref={toolRef} id="tool">
        <LeadGeneratorSection onOpenAuth={openAuth} />
      </div>
      <PricingSection onGetStarted={scrollToTool} />
      <FaqSection />
      <FooterSection />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
};

export default Index;
