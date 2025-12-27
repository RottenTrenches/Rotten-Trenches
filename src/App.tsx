import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletContextProvider } from "./contexts/WalletContext";
import Index from "./pages/Index";
import Leaderboard from "./pages/Leaderboard";
import AddKOL from "./pages/AddKOL";
import Bounties from "./pages/Bounties";
import Governance from "./pages/Governance";
import MemeForge from "./pages/MemeForge";
import Analytics from "./pages/Analytics";
import KOLProfile from "./pages/KOLProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WalletContextProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/add-kol" element={<AddKOL />} />
            <Route path="/kol/:id" element={<KOLProfile />} />
            <Route path="/bounties" element={<Bounties />} />
            <Route path="/governance" element={<Governance />} />
            <Route path="/meme-forge" element={<MemeForge />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </WalletContextProvider>
  </QueryClientProvider>
);

export default App;
