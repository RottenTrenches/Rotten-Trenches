import { motion } from "framer-motion";

export const ExplanationSection = () => {
  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Wooden signpost background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-decay-dark via-background to-background" />
      
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
        className="relative z-10 max-w-3xl mx-auto"
      >
        {/* Weathered journal/signpost container */}
        <div className="relative p-8 md:p-12 bg-gradient-to-b from-wood-light/20 to-wood-dark/30 border-4 border-dirt rounded-sm">
          {/* Corner decorations */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-rust/50" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-rust/50" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-rust/50" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-rust/50" />
          
          {/* Title */}
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-pixel text-lg md:text-xl text-bone mb-8 text-center"
          >
            ~ What is This Place ~
          </motion.h2>
          
          {/* Content */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-6"
          >
            <p className="font-pixel text-[10px] md:text-xs leading-relaxed text-foreground/90 text-center">
              Rotten Trenches is a community platform for analyzing and 
              discussing crypto influencers.
            </p>
            
            <div className="w-16 h-[2px] bg-rust/50 mx-auto" />
            
            <p className="font-pixel text-[9px] md:text-[10px] leading-relaxed text-muted-foreground text-center">
              Users contribute insights, vote on rankings, use AI tools to detect 
              inconsistencies, create memes, place bounties for research, and 
              participate in governance.
            </p>
            
            <div className="w-16 h-[2px] bg-rust/50 mx-auto" />
            
            <p className="font-pixel text-[10px] md:text-xs text-primary text-center font-bold">
              Explore the world to contribute.
            </p>
          </motion.div>
        </div>
        
        {/* Wooden post decoration below */}
        <div className="flex justify-center">
          <div className="w-4 h-16 bg-gradient-to-b from-wood-dark to-dirt" />
        </div>
      </motion.div>
    </section>
  );
};
