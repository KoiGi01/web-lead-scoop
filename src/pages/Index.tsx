import { useRef } from "react";
import NavBar from "@/components/landing/NavBar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import LeadGeneratorSection from "@/components/landing/LeadGeneratorSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import PricingSection from "@/components/landing/PricingSection";
import FooterSection from "@/components/landing/FooterSection";

const Index = () => {
  const toolRef = useRef<HTMLDivElement>(null);

  const scrollToTool = () => {
    toolRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar onGetStarted={scrollToTool} />
      <HeroSection onGetStarted={scrollToTool} />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <div ref={toolRef} id="tool">
        <LeadGeneratorSection />
      </div>
      <PricingSection onGetStarted={scrollToTool} />
      <FooterSection />
    </div>
  );
};

export default Index;
