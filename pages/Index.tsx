import { useState, useEffect } from "react";
import { PageLayout } from "@/components/PageLayout";
import { HeroSection } from "@/components/HeroSection";
import { ExplanationSection } from "@/components/ExplanationSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { LiveKOLSection } from "@/components/LiveKOLSection";
import { NewComments } from "@/components/NewComments";
import { GlobalSearch } from "@/components/GlobalSearch";

const Index = () => {
  const [showSearch, setShowSearch] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      // Hide search after scrolling past hero section (approx 100vh)
      const heroHeight = window.innerHeight;
      setShowSearch(window.scrollY < heroHeight * 0.8);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <PageLayout>
      {/* Floating Search Button - Only visible in hero area */}
      {showSearch && (
        <div className="fixed top-20 right-4 z-40 transition-opacity duration-300">
          <GlobalSearch />
        </div>
      )}
      
      {/* Main content */}
      <HeroSection />
      <ExplanationSection />
      <FeaturesSection />
      <LiveKOLSection />
      
      {/* New Comments Section */}
      <section className="relative py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <NewComments />
        </div>
      </section>
    </PageLayout>
  );
};

export default Index;