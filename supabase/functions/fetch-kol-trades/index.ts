import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOL_MINT = "So11111111111111111111111111111111111111112";
const SOL_DECIMALS = 9;
const SOL_IMAGE =
  "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png";

const MIN_SOL_AMOUNT = 0.4;

interface TokenMetadata {
  symbol: string;
  name: string;
  image: string | null;
  decimals: number;
}

function toNumber(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function solFromLamports(lamports: any): number {
  return toNumber(lamports) / Math.pow(10, SOL_DECIMALS);
}

async function getTokenMetadata(mints: string[], heliusApiKey: string): Promise<Map<string, TokenMetadata>> {
  const result = new Map<string, TokenMetadata>();

  result.set(SOL_MINT, {
    symbol: "SOL",
    name: "Solana",
    image: SOL_IMAGE,
    decimals: SOL_DECIMALS,
  });

  const mintsToFetch = Array.from(new Set(mints.filter((m) => m && m !== SOL_MINT)));
  if (mintsToFetch.length === 0) return result;

  try {
    const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "token-metadata",
        method: "getAssetBatch",
        params: { ids: mintsToFetch },
      }),
    });

    if (!response.ok) {
      console.error("DAS API error:", await response.text());
      return result;
    }

    const data = await response.json();
    if (!data?.result || !Array.isArray(data.result)) return result;

    for (const asset of data.result) {
      if (!asset?.id) continue;
      const mint = asset.id as string;

      const symbol = asset.content?.metadata?.symbol?.trim() || asset.token_info?.symbol?.trim() || null;
      const name = asset.content?.metadata?.name?.trim() || asset.token_info?.name?.trim() || null;
      const image = asset.content?.links?.image || asset.content?.files?.[0]?.uri || null;
      const decimals = asset.token_info?.decimals ?? 6;

      result.set(mint, {
        symbol: symbol || mint.slice(0, 6),
        name: name || symbol || mint.slice(0, 6),
        image,
        decimals,
      });
    }
  } catch (err) {
    console.error("Error fetching token metadata:", err);
  }

  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress } = await req.json();

    if (!walletAddress) {
      return new Response(JSON.stringify({ error: "Wallet address is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const heliusApiKey = Deno.env.get("HELIUS_API_KEY");
    if (!heliusApiKey) {
      return new Response(JSON.stringify({ error: "Helius API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Fetching transactions for wallet: ${walletAddress}`);

    const txUrl = `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${heliusApiKey}&limit=100`;
    const response = await fetch(txUrl);

    if (!response.ok) {
      const errText = await response.text();
      console.error("Helius tx fetch error:", errText);
      return new Response(JSON.stringify({ error: "Failed to fetch transactions", trades: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transactions = await response.json();
    console.log(`Fetched ${Array.isArray(transactions) ? transactions.length : 0} total transactions`);

    // Filter for SWAP type transactions
    const swapTxs = (Array.isArray(transactions) ? transactions : []).filter((tx: any) => tx?.type === "SWAP");
    console.log(`Found ${swapTxs.length} SWAP transactions`);

    // Collect all mints for metadata lookup
    const allMints = new Set<string>();
    for (const tx of swapTxs) {
      for (const t of (tx?.tokenTransfers || [])) {
        if (t?.mint) allMints.add(t.mint);
      }
    }

    const tokenMetadata = await getTokenMetadata(Array.from(allMints), heliusApiKey);

    const trades: any[] = [];

    for (const tx of swapTxs) {
      const tokenTransfers = tx?.tokenTransfers || [];
      const nativeTransfers = tx?.nativeTransfers || [];

      // Find SOL movements
      let solSpent = 0;
      let solReceived = 0;

      for (const nt of nativeTransfers) {
        if (nt.fromUserAccount === walletAddress) {
          solSpent += solFromLamports(nt.amount);
        }
        if (nt.toUserAccount === walletAddress) {
          solReceived += solFromLamports(nt.amount);
        }
      }

      // Find token movements (non-SOL)
      let tokenBoughtMint: string | null = null;
      let tokenBoughtAmount = 0;
      let tokenSoldMint: string | null = null;
      let tokenSoldAmount = 0;

      for (const tt of tokenTransfers) {
        if (!tt.mint || tt.mint === SOL_MINT) continue;

        if (tt.toUserAccount === walletAddress) {
          // Token coming IN = bought
          const amt = toNumber(tt.tokenAmount);
          if (amt > tokenBoughtAmount) {
            tokenBoughtAmount = amt;
            tokenBoughtMint = tt.mint;
          }
        }
        if (tt.fromUserAccount === walletAddress) {
          // Token going OUT = sold
          const amt = toNumber(tt.tokenAmount);
          if (amt > tokenSoldAmount) {
            tokenSoldAmount = amt;
            tokenSoldMint = tt.mint;
          }
        }
      }

      // Determine trade type
      let type: "BUY" | "SELL" | "SMALL_BUY" | "SMALL_SELL" | null = null;
      let tokenMint: string | null = null;
      let tokenAmount = 0;
      let solAmount = 0;

      // BUY: spent SOL, received token
      if (solSpent > 0.001 && tokenBoughtMint) {
        tokenMint = tokenBoughtMint;
        tokenAmount = tokenBoughtAmount;
        solAmount = solSpent;
        type = solSpent >= MIN_SOL_AMOUNT ? "BUY" : "SMALL_BUY";
      }
      // SELL: received SOL, spent token
      else if (solReceived > 0.001 && tokenSoldMint) {
        tokenMint = tokenSoldMint;
        tokenAmount = tokenSoldAmount;
        solAmount = solReceived;
        type = solReceived >= MIN_SOL_AMOUNT ? "SELL" : "SMALL_SELL";
      }

      if (!type || !tokenMint) continue;

      const meta = tokenMetadata.get(tokenMint);
      const isBuy = type === "BUY" || type === "SMALL_BUY";

      const tokenIn = isBuy
        ? { symbol: "SOL", amount: solAmount, image: SOL_IMAGE }
        : { symbol: meta?.symbol || tokenMint.slice(0, 6), amount: tokenAmount, image: meta?.image || null };

      const tokenOut = isBuy
        ? { symbol: meta?.symbol || tokenMint.slice(0, 6), amount: tokenAmount, image: meta?.image || null }
        : { symbol: "SOL", amount: solAmount, image: SOL_IMAGE };

      trades.push({
        signature: tx.signature,
        timestamp: tx.timestamp * 1000,
        type,
        description: tx.description || "Token Swap",
        tokenIn,
        tokenOut,
        fee: tx.fee || 0,
        success: tx.transactionError === null,
      });

      if (trades.length >= 20) break;
    }

    console.log(`Returning ${trades.length} trades`);

    return new Response(JSON.stringify({ trades, fetched_at: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching trades:", error);
    return new Response(JSON.stringify({ error: "Unknown error", trades: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
