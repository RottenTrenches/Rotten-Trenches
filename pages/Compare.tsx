import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageLayout } from "@/components/PageLayout";
import { GitCompare, Search, X, Star, TrendingUp, Users, MessageSquare, Plus, Filter, ArrowUpDown, Calendar, ThumbsUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { CategoryBadge } from "@/components/CategoryBadge";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

interface KOL {
  id: string;
  username: string;
  twitter_handle: string;
  profile_pic_url: string | null;
  rating: number;
  total_votes: number;
  categories: string[] | null;
  created_at: string;
}

type SortType = "rating_high" | "rating_low" | "votes_high" | "votes_low" | "newest" | "oldest";

const COLORS = ["#ef4444", "#22c55e", "#3b82f6"];

const SORT_OPTIONS: { value: SortType; label: string; icon: React.ReactNode }[] = [
  { value: "rating_high", label: "Highest Rating", icon: <Star className="w-3 h-3" /> },
  { value: "rating_low", label: "Lowest Rating", icon: <Star className="w-3 h-3" /> },
  { value: "votes_high", label: "Most Reviews", icon: <ThumbsUp className="w-3 h-3" /> },
  { value: "votes_low", label: "Least Reviews", icon: <ThumbsUp className="w-3 h-3" /> },
  { value: "newest", label: "Newest", icon: <Calendar className="w-3 h-3" /> },
  { value: "oldest", label: "Oldest", icon: <Calendar className="w-3 h-3" /> },
];

export default function Compare() {
  const [searchQuery, setSearchQuery] = useState("");
  const [allKols, setAllKols] = useState<KOL[]>([]);
  const [selectedKols, setSelectedKols] = useState<KOL[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [sortBy, setSortBy] = useState<SortType>("rating_high");
  const [showSortMenu, setShowSortMenu] = useState(false);

  useEffect(() => {
    fetchKOLs();
  }, []);

  const fetchKOLs = async () => {
    const { data } = await supabase
      .from('kols')
      .select('id, username, twitter_handle, profile_pic_url, rating, total_votes, categories, created_at')
      .order('rating', { ascending: false });
    
    if (data) setAllKols(data);
  };

  // Filter and sort KOLs based on search query and sort option
  const filteredAndSortedKols = useMemo(() => {
    let results = allKols.filter(k => !selectedKols.find(s => s.id === k.id));
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(k => 
        k.username.toLowerCase().includes(query) ||
        k.twitter_handle.toLowerCase().includes(query) ||
        k.categories?.some(cat => cat.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    results.sort((a, b) => {
      switch (sortBy) {
        case "rating_high":
          return Number(b.rating) - Number(a.rating);
        case "rating_low":
          return Number(a.rating) - Number(b.rating);
        case "votes_high":
          return b.total_votes - a.total_votes;
        case "votes_low":
          return a.total_votes - b.total_votes;
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default:
          return 0;
      }
    });

    return results;
  }, [allKols, selectedKols, searchQuery, sortBy]);

  // Show suggestions when input is focused (even without typing)
  const searchResults = showSearch ? filteredAndSortedKols.slice(0, 8) : [];

  const addKol = (kol: KOL) => {
    if (selectedKols.length < 3) {
      setSelectedKols([...selectedKols, kol]);
      setSearchQuery("");
      setShowSearch(false);
    }
  };

  const removeKol = (id: string) => {
    setSelectedKols(selectedKols.filter(k => k.id !== id));
  };

  const renderStars = (rating: number, size = "w-3 h-3") => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size} ${
            star <= rating ? "text-secondary fill-secondary" : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );

  // Generate mock historical data for comparison
  const generateChartData = () => {
    const days = 14;
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dataPoint: Record<string, any> = {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      };
      selectedKols.forEach((kol) => {
        const baseRating = Number(kol.rating);
        const variation = (Math.random() - 0.5) * 0.8;
        dataPoint[kol.username] = Math.max(0, Math.min(5, baseRating + variation)).toFixed(2);
      });
      return dataPoint;
    });
  };

  // Generate radar chart data
  const generateRadarData = () => {
    const metrics = ["Rating", "Votes", "Engagement", "Consistency", "Influence"];
    return metrics.map(metric => {
      const point: Record<string, any> = { metric };
      selectedKols.forEach(kol => {
        let value = 0;
        switch (metric) {
          case "Rating":
            value = (Number(kol.rating) / 5) * 100;
            break;
          case "Votes":
            value = Math.min(100, (kol.total_votes / 300) * 100);
            break;
          case "Engagement":
            value = 30 + Math.random() * 70;
            break;
          case "Consistency":
            value = 40 + Math.random() * 60;
            break;
          case "Influence":
            value = 25 + Math.random() * 75;
            break;
        }
        point[kol.username] = Math.round(value);
      });
      return point;
    });
  };

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <GitCompare className="w-8 h-8 text-secondary" />
            <h1 className="font-pixel text-2xl md:text-3xl text-foreground">
              COMPARE KOLs
            </h1>
          </div>
          <p className="font-pixel text-[9px] text-muted-foreground">
            Select up to 3 KOLs to compare side-by-side
          </p>
        </motion.div>

        {/* Selection Area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[0, 1, 2].map(slot => {
            const kol = selectedKols[slot];
            return (
              <motion.div
                key={slot}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: slot * 0.1 }}
                className="relative"
              >
                {kol ? (
                  <div 
                    className="stat-card p-4 rounded-lg border-2 transition-colors"
                    style={{ borderColor: COLORS[slot] + "50" }}
                  >
                    <button
                      onClick={() => removeKol(kol.id)}
                      className="absolute top-2 right-2 p-1 hover:bg-destructive/20 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-destructive" />
                    </button>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[slot] }}
                      />
                      <img
                        src={kol.profile_pic_url || `https://ui-avatars.com/api/?name=${kol.username}&background=random`}
                        alt={kol.username}
                        className="w-12 h-12 rounded-full border border-border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${kol.username}&background=random`;
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-pixel text-[10px] text-foreground truncate">{kol.username}</p>
                        <p className="font-pixel text-[8px] text-muted-foreground">{kol.twitter_handle}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {renderStars(Number(kol.rating))}
                          <span className="font-pixel text-[7px] text-muted-foreground">
                            ({kol.total_votes})
                          </span>
                        </div>
                      </div>
                    </div>
                    {kol.categories && kol.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {kol.categories.map(cat => (
                          <CategoryBadge key={cat} category={cat} />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSearch(true)}
                    className="w-full h-32 stat-card rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 group"
                  >
                    <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="font-pixel text-[9px] text-muted-foreground group-hover:text-primary transition-colors">
                      Add KOL
                    </span>
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Search Modal */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-start justify-center pt-24 px-4"
              onClick={() => setShowSearch(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-md stat-card rounded-lg p-4"
                onClick={e => e.stopPropagation()}
              >
                {/* Search Input */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search KOLs by name, handle, or category..."
                    className="pl-9 pr-9 font-pixel text-[10px]"
                    autoFocus
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>

                {/* Sort/Filter Controls */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="relative flex-1">
                    <button
                      onClick={() => setShowSortMenu(!showSortMenu)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/50 rounded border border-border transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                        <span className="font-pixel text-[8px] text-foreground">
                          {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
                        </span>
                      </div>
                      <Filter className="w-3 h-3 text-muted-foreground" />
                    </button>
                    
                    <AnimatePresence>
                      {showSortMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute top-full left-0 right-0 mt-1 stat-card rounded border border-border z-10 overflow-hidden"
                        >
                          {SORT_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => { setSortBy(option.value); setShowSortMenu(false); }}
                              className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors text-left ${
                                sortBy === option.value ? 'bg-primary/20' : ''
                              }`}
                            >
                              {option.icon}
                              <span className="font-pixel text-[8px] text-foreground">{option.label}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Results */}
                <div className="max-h-64 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    <div className="divide-y divide-border/50">
                      {searchResults.map(kol => (
                        <button
                          key={kol.id}
                          onClick={() => addKol(kol)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors"
                        >
                          <img
                            src={kol.profile_pic_url || `https://ui-avatars.com/api/?name=${kol.username}&background=random`}
                            alt={kol.username}
                            className="w-8 h-8 rounded-full border border-border"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${kol.username}&background=random`;
                            }}
                          />
                          <div className="flex-1 text-left">
                            <p className="font-pixel text-[9px] text-foreground">{kol.username}</p>
                            <p className="font-pixel text-[7px] text-muted-foreground">{kol.twitter_handle}</p>
                            {kol.categories && kol.categories.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {kol.categories.slice(0, 2).map(cat => (
                                  <span key={cat} className="font-pixel text-[6px] px-1 py-0.5 bg-accent/20 text-accent rounded">
                                    {cat}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            {renderStars(Number(kol.rating), "w-2 h-2")}
                            <p className="font-pixel text-[7px] text-muted-foreground mt-1">{kol.total_votes} votes</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="font-pixel text-[9px] text-muted-foreground">
                        {allKols.length === 0 ? "Loading KOLs..." : "No KOLs found matching your criteria"}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comparison Content */}
        {selectedKols.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Stats Comparison */}
            <div className="stat-card rounded-lg p-6">
              <h3 className="font-pixel text-[12px] text-foreground mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-secondary" />
                Quick Stats
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left font-pixel text-[8px] text-muted-foreground p-2">Metric</th>
                      {selectedKols.map((kol, idx) => (
                        <th key={kol.id} className="text-center font-pixel text-[8px] p-2" style={{ color: COLORS[idx] }}>
                          {kol.username}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="font-pixel text-[9px] text-muted-foreground p-2">Rating</td>
                      {selectedKols.map(kol => (
                        <td key={kol.id} className="text-center p-2">
                          <div className="flex items-center justify-center gap-1">
                            {renderStars(Number(kol.rating), "w-2 h-2")}
                            <span className="font-pixel text-[9px] text-foreground">{Number(kol.rating).toFixed(2)}</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="font-pixel text-[9px] text-muted-foreground p-2">Total Votes</td>
                      {selectedKols.map(kol => (
                        <td key={kol.id} className="text-center font-pixel text-[10px] text-foreground p-2">
                          {kol.total_votes}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="font-pixel text-[9px] text-muted-foreground p-2">Categories</td>
                      {selectedKols.map(kol => (
                        <td key={kol.id} className="text-center p-2">
                          <div className="flex flex-wrap justify-center gap-1">
                            {kol.categories?.map(cat => (
                              <CategoryBadge key={cat} category={cat} />
                            )) || <span className="font-pixel text-[7px] text-muted-foreground">—</span>}
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rating Trend Chart */}
            <div className="stat-card rounded-lg p-6">
              <h3 className="font-pixel text-[12px] text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                Rating Trend (14 Days)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={generateChartData()}>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis 
                      domain={[0, 5]}
                      tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '10px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '9px' }} />
                    {selectedKols.map((kol, idx) => (
                      <Line
                        key={kol.id}
                        type="monotone"
                        dataKey={kol.username}
                        stroke={COLORS[idx]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Radar Chart */}
            <div className="stat-card rounded-lg p-6">
              <h3 className="font-pixel text-[12px] text-foreground mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Performance Overview
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={generateRadarData()}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis 
                      dataKey="metric" 
                      tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <PolarRadiusAxis 
                      angle={30} 
                      domain={[0, 100]}
                      tick={{ fontSize: 7, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    {selectedKols.map((kol, idx) => (
                      <Radar
                        key={kol.id}
                        name={kol.username}
                        dataKey={kol.username}
                        stroke={COLORS[idx]}
                        fill={COLORS[idx]}
                        fillOpacity={0.2}
                      />
                    ))}
                    <Legend wrapperStyle={{ fontSize: '9px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {selectedKols.length < 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <GitCompare className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="font-pixel text-[10px] text-muted-foreground">
              Select at least 2 KOLs to compare
            </p>
          </motion.div>
        )}
      </div>
    </PageLayout>
  );
}
