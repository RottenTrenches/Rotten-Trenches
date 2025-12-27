import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PixelButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "accent";
  onClick?: () => void;
  className?: string;
}

export const PixelButton = ({
  children,
  variant = "primary",
  onClick,
  className = "",
}: PixelButtonProps) => {
  const variantStyles = {
    primary: "bg-gradient-to-b from-primary to-blood border-rust text-primary-foreground",
    secondary: "bg-gradient-to-b from-secondary to-rust border-secondary text-secondary-foreground",
    accent: "bg-gradient-to-b from-accent to-mold border-mold text-accent-foreground",
  };

  return (
    <motion.button
      onClick={onClick}
      className={`
        relative px-6 py-3 font-pixel text-xs uppercase tracking-wider
        border-2 
        shadow-deep
        transition-all duration-150
        ${variantStyles[variant]}
        ${className}
      `}
      style={{
        boxShadow: "inset 0 -3px 0 rgba(0,0,0,0.3), 0 4px 0 rgba(0,0,0,0.4)",
      }}
      whileHover={{
        y: -2,
        boxShadow: "inset 0 -3px 0 rgba(0,0,0,0.3), 0 6px 0 rgba(0,0,0,0.4)",
      }}
      whileTap={{
        y: 2,
        boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.3), 0 2px 0 rgba(0,0,0,0.4)",
      }}
    >
      {children}
    </motion.button>
  );
};
