import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  delay?: number;
}

export const StatCard = ({ icon: Icon, label, value, delay = 0 }: StatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      className="stat-card p-6 rounded-sm flex flex-col items-center gap-3 hover:border-primary/50 transition-colors duration-300"
    >
      <div className="p-3 bg-muted rounded-sm">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <span className="font-pixel text-2xl text-foreground">{value}</span>
      <span className="font-pixel text-[8px] text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
    </motion.div>
  );
};
