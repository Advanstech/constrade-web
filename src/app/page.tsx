"use client";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/layout/Footer";
import { PriceTicker } from "@/components/market/PriceTicker";
import { Hero } from "./(marketing)/Hero";
import { Services } from "./(marketing)/Services";
import { MarketsSection } from "./(marketing)/MarketsSection";
import { Research } from "./(marketing)/Research";
import { Regulators } from "./(marketing)/Regulators";
import { CtaBand } from "./(marketing)/CtaBand";

const MarketingHome = () => {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <PriceTicker />
        <Services />
        <MarketsSection />
        <Research />
        <Regulators />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
};

export default MarketingHome;
