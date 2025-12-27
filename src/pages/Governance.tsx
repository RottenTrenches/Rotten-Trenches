import { motion } from "framer-motion";
import { PageLayout } from "@/components/PageLayout";
import { Scale, Clock, Users } from "lucide-react";

export default function Governance() {
  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Scale className="w-8 h-8 text-secondary" />
            <h1 className="font-pixel text-2xl md:text-3xl text-foreground">
              GOVERNANCE
            </h1>
          </div>
          <p className="font-pixel text-[9px] text-muted-foreground mb-6">
            Community-driven decision making
          </p>
        </motion.div>

        {/* Coming Soon Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="stat-card p-8 rounded-sm text-center"
        >
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Scale className="w-16 h-16 text-primary/50" />
              <div className="absolute inset-0 animate-pulse">
                <Scale className="w-16 h-16 text-primary/30" />
              </div>
            </div>
          </div>
          
          <h2 className="font-pixel text-lg text-foreground mb-4">
            Governance Coming Soon
          </h2>
          
          <p className="font-pixel text-[10px] text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
            We're building a community-first governance system. Once we establish a strong community foundation, 
            you'll be able to create proposals, vote on platform decisions, and shape the future of Rotten Tracker together.
          </p>

          <div className="grid md:grid-cols-3 gap-6 max-w-2xl mx-auto">
            <div className="stat-card p-4 rounded-sm">
              <Clock className="w-6 h-6 text-secondary mx-auto mb-2" />
              <h3 className="font-pixel text-[9px] text-foreground mb-1">Phase 1</h3>
              <p className="font-pixel text-[7px] text-muted-foreground">
                Community Building
              </p>
            </div>
            <div className="stat-card p-4 rounded-sm">
              <Users className="w-6 h-6 text-accent mx-auto mb-2" />
              <h3 className="font-pixel text-[9px] text-foreground mb-1">Phase 2</h3>
              <p className="font-pixel text-[7px] text-muted-foreground">
                Token Launch & Distribution
              </p>
            </div>
            <div className="stat-card p-4 rounded-sm">
              <Scale className="w-6 h-6 text-primary mx-auto mb-2" />
              <h3 className="font-pixel text-[9px] text-foreground mb-1">Phase 3</h3>
              <p className="font-pixel text-[7px] text-muted-foreground">
                Full Governance Activation
              </p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-muted/20 rounded-sm">
            <p className="font-pixel text-[8px] text-accent">
              Stay tuned for updates on our governance launch!
            </p>
          </div>
        </motion.div>
      </div>
    </PageLayout>
  );
}