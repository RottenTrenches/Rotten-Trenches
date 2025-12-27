import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { Home, Trophy, UserPlus, Gift, Scale, Palette, BarChart3 } from "lucide-react";
import { WalletButton } from "./WalletButton";

const navItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Trophy, label: "Leaderboard", href: "/leaderboard" },
  { icon: UserPlus, label: "ADD KOL", href: "/add-kol" },
  { icon: Gift, label: "Bounties", href: "/bounties" },
  { icon: Scale, label: "Governance", href: "/governance" },
  { icon: Palette, label: "Meme Forge", href: "/meme-forge" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
];

export const PixelNav = () => {
  const location = useLocation();

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="fixed top-0 left-0 right-0 z-50 pixel-nav px-4 py-3"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-pixel text-[10px] text-primary">RT</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className={`flex items-center gap-2 px-3 py-2 transition-all duration-200 rounded ${
                location.pathname === item.href
                  ? "text-primary bg-primary/10"
                  : "text-foreground/70 hover:text-foreground hover:bg-muted/30"
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span className="font-pixel text-[8px] uppercase">{item.label}</span>
            </Link>
          ))}
        </div>

        <WalletButton />
      </div>
    </motion.nav>
  );
};
