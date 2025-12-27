import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  type: "spore" | "ash" | "ember";
}

export const ParticleField = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const generated: Particle[] = [];
    for (let i = 0; i < 30; i++) {
      generated.push({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 10,
        duration: 8 + Math.random() * 8,
        size: 2 + Math.random() * 4,
        type: ["spore", "ash", "ember"][Math.floor(Math.random() * 3)] as Particle["type"],
      });
    }
    setParticles(generated);
  }, []);

  const getParticleColor = (type: Particle["type"]) => {
    switch (type) {
      case "ember":
        return "bg-primary/60";
      case "ash":
        return "bg-fog/40";
      case "spore":
        return "bg-mold/50";
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`absolute rounded-full ${getParticleColor(particle.type)}`}
          style={{
            left: `${particle.x}%`,
            width: particle.size,
            height: particle.size,
          }}
          initial={{ y: "100vh", opacity: 0 }}
          animate={{
            y: [null, "-20px"],
            opacity: [0, 0.6, 0.4, 0],
            x: [0, Math.random() * 30 - 15, Math.random() * 20 - 10, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};
