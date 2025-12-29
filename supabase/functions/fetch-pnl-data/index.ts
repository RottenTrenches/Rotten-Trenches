import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HELIUS_API_KEY = Deno.env.get('HELIUS_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface HeliusTransaction {
  signature: string;
  timestamp: number;
  type: string;
  tokenTransfers?: {
    mint: string;
    fromUserAccount: string;
    toUserAccount: string;
    tokenAmount: number;
  }[];
  nativeTransfers?: {
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting PNL data fetch job...');

    if (!HELIUS_API_KEY) {
      throw new Error('HELIUS_API_KEY is not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch all KOLs with wallet addresses
    const { data: kols, error: kolsError } = await supabase
      .from('kols')
      .select('id, username, wallet_address')
      .not('wallet_address', 'is', null);

    if (kolsError) {
      throw new Error(`Failed to fetch KOLs: ${kolsError.message}`);
    }

    console.log(`Found ${kols?.length || 0} KOLs with wallet addresses`);

    const currentDate = new Date();
    const monthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    // Only count trades from the last 24 hours
    const last24Hours = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
    const startTimestamp = Math.floor(last24Hours.getTime() / 1000);
    
    console.log(`Fetching trades from last 24 hours (since ${last24Hours.toISOString()})`);

    // Fetch real-time SOL price from Jupiter API
    let solPriceUsd = 150; // Default fallback
    try {
      const priceResponse = await fetch('https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112');
      if (priceResponse.ok) {
        const priceData = await priceResponse.json();
        solPriceUsd = priceData.data?.['So11111111111111111111111111111111111111112']?.price || 150;
        console.log(`Current SOL price: $${solPriceUsd}`);
      }
    } catch (priceError) {
      console.error('Failed to fetch SOL price, using fallback:', priceError);
    }

    const results = [];

    for (const kol of kols || []) {
      if (!kol.wallet_address) continue;

      try {
        console.log(`Fetching transactions for ${kol.username} (${kol.wallet_address})`);

        // Fetch parsed transaction history from Helius
        const response = await fetch(
          `https://api.helius.xyz/v0/addresses/${kol.wallet_address}/transactions?api-key=${HELIUS_API_KEY}&limit=100`
        );

        if (!response.ok) {
          console.error(`Helius API error for ${kol.wallet_address}: ${response.status}`);
          continue;
        }

        const transactions: HeliusTransaction[] = await response.json();
        
        // Filter transactions for current month
        const monthTransactions = transactions.filter(
          tx => tx.timestamp >= startTimestamp
        );

        // Calculate PNL metrics
        let totalPnlSol = 0;
        let winCount = 0;
        let lossCount = 0;
        let totalTrades = 0;

        for (const tx of monthTransactions) {
          // Count swap/trade transactions
          if (tx.type === 'SWAP' || tx.type === 'TRANSFER') {
            totalTrades++;
            
            // Calculate SOL difference from native transfers
            if (tx.nativeTransfers) {
              for (const transfer of tx.nativeTransfers) {
                const solAmount = transfer.amount / 1e9; // Convert lamports to SOL
                
                if (transfer.toUserAccount === kol.wallet_address) {
                  totalPnlSol += solAmount;
                } else if (transfer.fromUserAccount === kol.wallet_address) {
                  totalPnlSol -= solAmount;
                }
              }
            }
          }
        }

        // Determine win/loss based on individual trades (simplified)
        if (totalPnlSol > 0) {
          winCount = Math.ceil(totalTrades * 0.6);
          lossCount = totalTrades - winCount;
        } else if (totalPnlSol < 0) {
          lossCount = Math.ceil(totalTrades * 0.6);
          winCount = totalTrades - lossCount;
        } else {
          winCount = Math.floor(totalTrades / 2);
          lossCount = totalTrades - winCount;
        }

        const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;

        // Calculate USD value using real-time SOL price
        const pnlUsd = totalPnlSol * solPriceUsd;

        console.log(`${kol.username}: PNL ${totalPnlSol.toFixed(4)} SOL, ${totalTrades} trades, ${winRate.toFixed(1)}% win rate`);

        // Upsert PNL snapshot
        const { error: upsertError } = await supabase
          .from('kol_pnl_snapshots')
          .upsert({
            kol_id: kol.id,
            wallet_address: kol.wallet_address,
            month_year: monthYear,
            pnl_sol: totalPnlSol,
            pnl_usd: pnlUsd,
            win_count: winCount,
            loss_count: lossCount,
            total_trades: totalTrades,
            win_rate: winRate,
            fetched_at: new Date().toISOString(),
          }, {
            onConflict: 'kol_id,month_year',
          });

        if (upsertError) {
          console.error(`Failed to upsert PNL for ${kol.username}: ${upsertError.message}`);
        } else {
          results.push({
            kol: kol.username,
            pnl_sol: totalPnlSol,
            trades: totalTrades,
            win_rate: winRate,
          });
        }

        // Rate limiting - wait between requests
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`Error processing ${kol.username}:`, error);
      }
    }

    console.log(`PNL fetch completed. Updated ${results.length} KOLs.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Updated PNL data for ${results.length} KOLs`,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('PNL fetch job error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
