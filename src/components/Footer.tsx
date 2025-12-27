import { motion } from "framer-motion";
import logo from "@/assets/logo.png";

export const Footer = () => {
  return (
    <footer className="relative py-12 px-4 border-t border-border">
      <div className="absolute inset-0 bg-gradient-to-t from-decay-dark to-background" />
      
      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src={logo} alt="Rotten Trenches" className="w-8 h-8 rounded" />
            <h3 className="font-pixel text-lg text-primary">
              ROTTEN TRENCHES
            </h3>
          </div>
          <p className="font-pixel text-[8px] text-muted-foreground mb-6">
            Community-driven crypto influencer analysis
          </p>
          
          <div className="flex items-center justify-center gap-6 mb-8">
            <a href="#" className="font-pixel text-[8px] text-foreground/70 hover:text-foreground transition-colors">
              Docs
            </a>
            <a href="#" className="font-pixel text-[8px] text-foreground/70 hover:text-foreground transition-colors">
              GitHub
            </a>
            <a href="#" className="font-pixel text-[8px] text-foreground/70 hover:text-foreground transition-colors">
              Discord
            </a>
            <a href="#" className="font-pixel text-[8px] text-foreground/70 hover:text-foreground transition-colors">
              Twitter
            </a>
          </div>
          
          <div className="w-24 h-[2px] bg-border mx-auto mb-6" />
          
          <p className="font-pixel text-[7px] text-muted-foreground">
            Built on Solana • Community Governed
          </p>
        </motion.div>
      </div>
    </footer>
  );
};
