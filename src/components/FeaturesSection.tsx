import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Skull, Sprout, Users, MessageCircle } from "lucide-react";
import { StatCard } from "./StatCard";
import { PixelButton } from "./PixelButton";

const stats = [
  { icon: Skull, label: "KOLs Tracked", value: "5" },
  { icon: Sprout, label: "Open Bounties", value: "2" },
  { icon: Users, label: "Active Proposals", value: "2" },
  { icon: MessageCircle, label: "Discussions", value: "2" },
];

const features = [
  {
    title: "Leaderboard",
    description: "Community-driven KOL rankings. Vote to change scores.",
    color: "text-primary",
    href: "/leaderboard",
  },
  {
    title: "Discussion Arena",
    description: "Share analysis and insights. Upvote quality contributions.",
    color: "text-secondary",
    href: "/discussion",
  },
  {
    title: "Bounties",
    description: "Fund research bounties. Earn rewards for contributions.",
    color: "text-accent",
    href: "/bounties",
  },
  {
    title: "Meme Forge",
    description: "Create pixel art memes. Download your creations.",
    color: "text-rust-light",
    href: "/meme-forge",
  },
];

export const FeaturesSection = () => {
  return (
    <section className="relative py-20 px-4">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-decay-purple/20 to-background" />
      
      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-pixel text-xl md:text-2xl text-foreground mb-4">
            ~ The Village Board ~
          </h2>
          <p className="font-pixel text-[9px] text-muted-foreground">
            Live community metrics
          </p>
        </motion.div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
          {stats.map((stat, index) => (
            <StatCard
              key={stat.label}
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              delay={index * 0.1}
            />
          ))}
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Link to={feature.href} className="block stat-card p-6 rounded-sm hover:border-primary/30 transition-colors duration-300">
                <h3 className={`font-pixel text-sm mb-3 ${feature.color}`}>
                  {feature.title}
                </h3>
                <p className="font-pixel text-[9px] text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link to="/leaderboard">
            <PixelButton variant="primary">View Leaderboard</PixelButton>
          </Link>
          <Link to="/discussion">
            <PixelButton variant="secondary">Join Discussion</PixelButton>
          </Link>
          <Link to="/bounties">
            <PixelButton variant="accent">View Bounties</PixelButton>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};
