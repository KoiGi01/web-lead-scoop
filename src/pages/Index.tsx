import NavBarV2 from "@/components/landing/NavBarV2";
import TickerStrip from "@/components/landing/TickerStrip";
import HeroSectionV2 from "@/components/landing/HeroSectionV2";
import MarqueeStrip from "@/components/landing/MarqueeStrip";
import StatsBandSection from "@/components/landing/StatsBandSection";
import HowItWorksV2 from "@/components/landing/HowItWorksV2";
import FeaturesSectionV2 from "@/components/landing/FeaturesSectionV2";
import QuoteSection from "@/components/landing/QuoteSection";
import PricingSectionV2 from "@/components/landing/PricingSectionV2";
import FaqSectionV2 from "@/components/landing/FaqSectionV2";
import CTASection from "@/components/landing/CTASection";
import FooterSectionV2 from "@/components/landing/FooterSectionV2";

const Index = () => {
  const appUrl = window.location.hostname.startsWith("app.")
    ? window.location.origin
    : "https://app.globaleads22.com";

  const goToApp = () => { window.location.href = appUrl; };

  const handlePricingClick = (bundleKey: string) => {
    window.location.href = `${appUrl}?bundle=${bundleKey}`;
  };

  return (
    <div style={{ background: '#000', minHeight: '100vh' }}>
      <NavBarV2 onGetStarted={goToApp} onOpenAuth={goToApp} />
      <TickerStrip />
      <HeroSectionV2 onGetStarted={goToApp} />
      <MarqueeStrip />
      <StatsBandSection />
      <HowItWorksV2 />
      <FeaturesSectionV2 />
      <QuoteSection />
      <PricingSectionV2 onGetStarted={handlePricingClick} />
      <FaqSectionV2 />
      <CTASection onGetStarted={goToApp} />
      <FooterSectionV2 />
    </div>
  );
};

export default Index;
