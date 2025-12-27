import { ReactNode } from "react";
import { PixelNav } from "./PixelNav";
import { Footer } from "./Footer";

interface PageLayoutProps {
  children: ReactNode;
}

export const PageLayout = ({ children }: PageLayoutProps) => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <PixelNav />
      <main className="pt-16">
        {children}
      </main>
      <Footer />
    </div>
  );
};
