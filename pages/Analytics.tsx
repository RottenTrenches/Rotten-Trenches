import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PageLayout } from "@/components/PageLayout";
import { BarChart3, TrendingUp, Users, MessageSquare, Activity, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  totalKOLs: number;
  totalVotes: number;
  totalComments: number;
  openBounties: number;
  newKOLsToday: number;
  newKOLsThisWeek: number;
  newKOLsThisMonth: number;
}

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("7d");
  const [stats, setStats] = useState<Stats>({
    totalKOLs: 0,
    totalVotes: 0,
    totalComments: 0,
    openBounties: 0,
    newKOLsToday: 0,
    newKOLsThisWeek: 0,
    newKOLsThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('analytics-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kols' }, () => {
        fetchStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kol_votes' }, () => {
        fetchStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kol_comments' }, () => {
        fetchStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bounties' }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch all stats in parallel
    const [kolsResult, votesResult, commentsResult, bountiesResult, newTodayResult, newWeekResult, newMonthResult] = await Promise.all([
      supabase.from('kols').select('id', { count: 'exact', head: true }),
      supabase.from('kol_votes').select('id', { count: 'exact', head: true }),
      supabase.from('kol_comments').select('id', { count: 'exact', head: true }),
      supabase.from('bounties').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('kols').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('kols').select('id', { count: 'exact', head: true }).gte('created_at', weekStart),
      supabase.from('kols').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
    ]);

    setStats({
      totalKOLs: kolsResult.count || 0,
      totalVotes: votesResult.count || 0,
      totalComments: commentsResult.count || 0,
      openBounties: bountiesResult.count || 0,
      newKOLsToday: newTodayResult.count || 0,
      newKOLsThisWeek: newWeekResult.count || 0,
      newKOLsThisMonth: newMonthResult.count || 0,
    });
    setLoading(false);
  };

  const getNewKOLsCount = () => {
    switch (timeRange) {
      case "24h": return stats.newKOLsToday;
      case "7d": return stats.newKOLsThisWeek;
      case "30d": return stats.newKOLsThisMonth;
    }
  };

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <BarChart3 className="w-8 h-8 text-secondary" />
            <h1 className="font-pixel text-2xl md:text-3xl text-foreground">
              ANALYTICS
            </h1>
          </div>
          <p className="font-pixel text-[9px] text-muted-foreground">
            Platform activity and community metrics
          </p>
        </motion.div>

        {/* Time Range Selector */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center gap-2 mb-8"
        >
          {(["24h", "7d", "30d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 font-pixel text-[8px] uppercase rounded transition-colors ${
                timeRange === range 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {range}
            </button>
          ))}
        </motion.div>

        {loading ? (
          <div className="text-center py-12">
            <p className="font-pixel text-[10px] text-muted-foreground">Loading analytics...</p>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12"
            >
              {[
                { label: "KOLs Tracked", value: stats.totalKOLs, icon: Users },
                { label: `New KOLs (${timeRange})`, value: getNewKOLsCount(), icon: UserPlus },
                { label: "Total Votes", value: stats.totalVotes, icon: TrendingUp },
                { label: "Reviews", value: stats.totalComments, icon: MessageSquare },
                { label: "Open Bounties", value: stats.openBounties, icon: Activity },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="stat-card p-4 rounded-sm text-center"
                >
                  <stat.icon className="w-5 h-5 text-secondary mx-auto mb-2" />
                  <p className="font-pixel text-lg text-foreground">{stat.value}</p>
                  <p className="font-pixel text-[7px] text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="stat-card rounded-sm p-6 text-center"
            >
              <h3 className="font-pixel text-sm text-foreground mb-4">Platform Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="font-pixel text-lg text-accent">{stats.totalKOLs}</p>
                  <p className="font-pixel text-[7px] text-muted-foreground">Total KOLs</p>
                </div>
                <div>
                  <p className="font-pixel text-lg text-secondary">{stats.totalVotes}</p>
                  <p className="font-pixel text-[7px] text-muted-foreground">Votes Cast</p>
                </div>
                <div>
                  <p className="font-pixel text-lg text-primary">{stats.totalComments}</p>
                  <p className="font-pixel text-[7px] text-muted-foreground">Reviews</p>
                </div>
                <div>
                  <p className="font-pixel text-lg text-rust-light">{stats.openBounties}</p>
                  <p className="font-pixel text-[7px] text-muted-foreground">Active Bounties</p>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* Empty State Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center font-pixel text-[8px] text-muted-foreground mt-8"
        >
          Analytics update in real-time as the community grows
        </motion.p>
      </div>
    </PageLayout>
  );
}
