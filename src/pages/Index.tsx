import { useNavigate } from "react-router-dom";
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
  const goToApp = () => navigate("/app");

  const openAuth = () => navigate("/app");

  return (
    <div className="min-h-screen bg-[#e0e5ec]">
      <NavBar onGetStarted={goToApp} onOpenAuth={openAuth} />
      <HeroSection onGetStarted={goToApp} />
      <StatsBar />
      <FeaturesSection />
      <HowItWorksSection />
      <UseCasesSection />
      <TestimonialsSection />
      <PricingSection onGetStarted={goToApp} />
      <FaqSection />
      <FooterSection />
    </div>
  );
};

export default Index;
