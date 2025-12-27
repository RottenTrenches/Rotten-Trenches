import { PixelNav } from "@/components/PixelNav";
import { HeroSection } from "@/components/HeroSection";
import { ExplanationSection } from "@/components/ExplanationSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { LiveKOLSection } from "@/components/LiveKOLSection";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navigation */}
      <PixelNav />
      
      {/* Main content */}
      <main>
        <HeroSection />
        <ExplanationSection />
        <FeaturesSection />
        <LiveKOLSection />
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
