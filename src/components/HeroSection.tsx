import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.png";

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background Image */}
      <motion.div
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${heroBg})`,
        }}
      />
      
      {/* Subtle animated overlay for atmosphere */}
      <motion.div 
        className="absolute inset-0 bg-decay-dark/30"
        animate={{ opacity: [0.3, 0.45, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Bottom gradient fade */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      
      {/* Top gradient for nav */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-decay-dark/60 to-transparent" />
      
      {/* Vignette effect */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-decay-dark/50" />
      
      {/* Main Title */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="relative z-20 text-center px-4"
      >
        <motion.h1
          className="font-pixel text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight leading-none"
          style={{
            background: "linear-gradient(180deg, #e63946 0%, #ff6b35 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(4px 4px 0 rgba(0,0,0,0.9)) drop-shadow(0 0 30px rgba(230,57,70,0.5))",
          }}
          animate={{ 
            filter: [
              "drop-shadow(4px 4px 0 rgba(0,0,0,0.9)) drop-shadow(0 0 20px rgba(230,57,70,0.4))",
              "drop-shadow(4px 4px 0 rgba(0,0,0,0.9)) drop-shadow(0 0 40px rgba(230,57,70,0.7))",
              "drop-shadow(4px 4px 0 rgba(0,0,0,0.9)) drop-shadow(0 0 20px rgba(230,57,70,0.4))",
            ]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          ROTTEN
        </motion.h1>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="font-pixel text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-secondary -mt-1 md:-mt-2"
          style={{ 
            textShadow: "3px 3px 0 rgba(0,0,0,0.9)",
            filter: "drop-shadow(0 0 20px rgba(255,107,53,0.5))"
          }}
        >
          TRENCHES
        </motion.h1>
      </motion.div>
      
      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.2 }}
        className="relative z-20 font-pixel text-[8px] md:text-[10px] text-bone/80 tracking-widest uppercase mt-8"
      >
        Community KOL Analysis Platform
      </motion.p>
      
      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center gap-2"
        >
          <span className="font-pixel text-[8px] text-muted-foreground uppercase">Scroll to enter</span>
          <div className="w-4 h-6 border-2 border-muted-foreground/50 rounded-sm flex justify-center pt-1">
            <motion.div
              animate={{ y: [0, 8, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1 h-2 bg-primary rounded-sm"
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};
