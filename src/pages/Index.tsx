import { useRef } from "react";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import LeadGeneratorSection from "@/components/landing/LeadGeneratorSection";
import FooterSection from "@/components/landing/FooterSection";

const Index = () => {
  const toolRef = useRef<HTMLDivElement>(null);

  const scrollToTool = () => {
    toolRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <HeroSection onGetStarted={scrollToTool} />
      <FeaturesSection />
      <HowItWorksSection />
      <div ref={toolRef}>
        <LeadGeneratorSection />
      </div>
      <FooterSection />
    </div>
  );
};

export default Index;
