import { motion } from "framer-motion";

export const FogLayer = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-5 overflow-hidden">
      {/* Primary fog layer */}
      <motion.div
        className="absolute inset-0 bg-gradient-radial from-transparent via-fog/5 to-fog/15"
        animate={{
          x: ["-10%", "10%", "-10%"],
          y: ["0%", "-5%", "0%"],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Secondary creeping fog */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-decay-dark/50 via-fog/10 to-transparent"
        animate={{
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Top atmospheric haze */}
      <div className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-sky/30 via-decay-purple/20 to-transparent" />
    </div>
  );
};
