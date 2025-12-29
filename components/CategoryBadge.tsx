import { cn } from "@/lib/utils";

export const KOL_CATEGORIES = [
  { id: "defi", label: "DeFi", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { id: "nfts", label: "NFTs", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { id: "memecoins", label: "Memecoins", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  { id: "trading", label: "Trading", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { id: "gaming", label: "Gaming", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  { id: "ai", label: "AI", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
] as const;

export type CategoryId = typeof KOL_CATEGORIES[number]["id"];

interface CategoryBadgeProps {
  category: string;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}

export const CategoryBadge = ({ category, className, onClick, selected }: CategoryBadgeProps) => {
  const categoryConfig = KOL_CATEGORIES.find(c => c.id === category);
  
  if (!categoryConfig) return null;
  
  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-pixel border transition-all",
        categoryConfig.color,
        onClick && "cursor-pointer hover:scale-105",
        selected && "ring-2 ring-white/50",
        className
      )}
    >
      {categoryConfig.label}
    </span>
  );
};

interface CategoryFilterProps {
  selected: string[];
  onChange: (categories: string[]) => void;
  className?: string;
}

export const CategoryFilter = ({ selected, onChange, className }: CategoryFilterProps) => {
  const toggleCategory = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(c => c !== id));
    } else {
      onChange([...selected, id]);
    }
  };
  
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {KOL_CATEGORIES.map(cat => (
        <CategoryBadge
          key={cat.id}
          category={cat.id}
          selected={selected.includes(cat.id)}
          onClick={() => toggleCategory(cat.id)}
        />
      ))}
    </div>
  );
};
