import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseTimeRange(query: string): { hours: number } | null {
  const q = query.toLowerCase();
  const hourMatch = q.match(/(?:last|past)\s+(\d+)\s*(?:hours?|hrs?|h|ชั่วโมง|ชม)/);
  if (hourMatch) return { hours: parseInt(hourMatch[1]) };
  const dayMatch = q.match(/(?:last|past)\s+(\d+)\s*(?:days?|d|วัน)/);
  if (dayMatch) return { hours: parseInt(dayMatch[1]) * 24 };
  if (q.includes("today") || q.includes("วันนี้")) return { hours: 24 };
  if (q.includes("yesterday") || q.includes("เมื่อวาน")) return { hours: 48 };
  return { hours: 24 };
}

function parseCategories(query: string): string[] {
  const q = query.toLowerCase();
  const cats: string[] = [];
  if (/\b(ai|artificial intelligence|เอไอ|ปัญญาประดิษฐ์)\b/.test(q)) cats.push("ai");
  if (/\b(crypto|bitcoin|btc|eth|เหรียญ|คริปโต)\b/.test(q)) cats.push("crypto");
  if (/\b(invest|stock|หุ้น|การลงทุน)\b/.test(q)) cats.push("investment");
  if (/\b(macro|เศรษฐกิจ|fed|inflation|เงินเฟ้อ|gdp|interest rate|ดอกเบี้ย)\b/.test(q)) cats.push("macro");
  if (/\b(tech|เทค|big tech|apple|google|microsoft|nvidia)\b/.test(q)) cats.push("tech-stocks");
  if (/\b(commodit|gold|oil|ทองคำ|น้ำมัน|โภคภัณฑ์|silver|เงิน)\b/.test(q)) cats.push("commodities");
  return cats;
}

// Detect if the question is about market/price data
const MARKET_PATTERNS = [
  /\b(price|ราคา)\b/i,
  /\b(how much|เท่าไหร่|เท่าไร)\b/i,
  /\b(btc|bitcoin|eth|ethereum|gold|ทองคำ|oil|น้ำมัน|nasdaq|s&p|sp500|dow|ดาวโจนส์)\s*(price|ราคา|now|ตอนนี้|today|วันนี้)?\b/i,
  /\b(price|ราคา)\s*(of|ของ)?\s*(btc|bitcoin|eth|ethereum|gold|ทองคำ|oil|น้ำมัน)\b/i,
];

function isMarketQuery(query: string): boolean {
  return MARKET_PATTERNS.some(p => p.test(query));
}

// Map query to CoinGecko IDs or asset type
interface AssetQuery {
  type: "crypto" | "traditional";
  ids: string[];
  labels: Record<string, string>;
}

function parseAssets(query: string): AssetQuery | null {
  const q = query.toLowerCase();
  const cryptoIds: string[] = [];
  const labels: Record<string, string> = {};

  if (/\b(btc|bitcoin)\b/.test(q)) { cryptoIds.push("bitcoin"); labels["bitcoin"] = "BTC"; }
  if (/\b(eth|ethereum)\b/.test(q)) { cryptoIds.push("ethereum"); labels["ethereum"] = "ETH"; }
  if (/\b(sol|solana)\b/.test(q)) { cryptoIds.push("solana"); labels["solana"] = "SOL"; }
  if (/\b(bnb)\b/.test(q)) { cryptoIds.push("binancecoin"); labels["binancecoin"] = "BNB"; }
  if (/\b(xrp|ripple)\b/.test(q)) { cryptoIds.push("ripple"); labels["ripple"] = "XRP"; }
  if (/\b(doge|dogecoin)\b/.test(q)) { cryptoIds.push("dogecoin"); labels["dogecoin"] = "DOGE"; }
  if (/\b(ada|cardano)\b/.test(q)) { cryptoIds.push("cardano"); labels["cardano"] = "ADA"; }

  if (cryptoIds.length > 0) return { type: "crypto", ids: cryptoIds, labels };

  // Traditional assets — we'll use a free proxy
  const tradIds: string[] = [];
  if (/\b(gold|ทองคำ|ทอง|xau)\b/.test(q)) { tradIds.push("gold"); labels["gold"] = "Gold"; }
  if (/\b(oil|น้ำมัน|crude|wti|brent)\b/.test(q)) { tradIds.push("oil"); labels["oil"] = "Crude Oil"; }
  if (/\b(nasdaq)\b/.test(q)) { tradIds.push("nasdaq"); labels["nasdaq"] = "NASDAQ"; }
  if (/\b(s&p|sp500|sp 500)\b/.test(q)) { tradIds.push("sp500"); labels["sp500"] = "S&P 500"; }
  if (/\b(dow|ดาวโจนส์)\b/.test(q)) { tradIds.push("dow"); labels["dow"] = "Dow Jones"; }

  if (tradIds.length > 0) return { type: "traditional", ids: tradIds, labels };

  // Default: if it's a market query but no specific asset, show BTC + ETH
  return { type: "crypto", ids: ["bitcoin", "ethereum"], labels: { bitcoin: "BTC", ethereum: "ETH" } };
}

async function fetchCryptoPrices(ids: string[]): Promise<Record<string, { usd: number; usd_24h_change: number }>> {
  try {
    const resp = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`,
      { headers: { Accept: "application/json" } }
    );
    if (!resp.ok) throw new Error(`CoinGecko ${resp.status}`);
    return await resp.json();
  } catch (e) {
    console.error("CoinGecko error:", e);
    return {};
  }
}

function formatMarketResponse(assets: AssetQuery, prices: Record<string, any>, lang: string): string {
  if (assets.type === "crypto") {
    const lines: string[] = [];
    for (const id of assets.ids) {
      const p = prices[id];
      if (!p) continue;
      const price = p.usd?.toLocaleString("en-US", { style: "currency", currency: "USD" });
      const change = p.usd_24h_change?.toFixed(2);
      const arrow = Number(change) >= 0 ? "🟢" : "🔴";
      const sign = Number(change) >= 0 ? "+" : "";
      lines.push(`### ${assets.labels[id]} ${arrow}\n**${price}**\n24h: ${sign}${change}%`);
    }
    if (lines.length === 0) {
      return lang === "th" ? "ไม่สามารถดึงข้อมูลราคาได้ในขณะนี้" : "Unable to fetch price data at this time.";
    }
    const header = lang === "th" ? "## 📊 ราคาตลาดล่าสุด" : "## 📊 Latest Market Prices";
    const footer = lang === "th" ? "\n\n*ข้อมูลจาก CoinGecko*" : "\n\n*Data from CoinGecko*";
    return header + "\n\n" + lines.join("\n\n") + footer;
  }

  // Traditional assets - return a note that we only have crypto realtime
  const note = lang === "th"
    ? "## 📊 ข้อมูลตลาด\n\nขณะนี้ระบบรองรับราคาเรียลไทม์สำหรับคริปโตเท่านั้น (BTC, ETH, SOL ฯลฯ)\n\nสำหรับข้อมูล Gold, Oil, Nasdaq กรุณาถามเกี่ยวกับข่าวที่เกี่ยวข้องแทน เช่น \"ข่าวทองคำวันนี้\""
    : "## 📊 Market Data\n\nReal-time prices are currently available for crypto assets (BTC, ETH, SOL, etc.).\n\nFor Gold, Oil, Nasdaq — try asking about related news instead, e.g. \"gold news today\"";
  return note;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, lang, history } = await req.json();
    if (!question) throw new Error("No question provided");

    // --- Intent: Market Data ---
    if (isMarketQuery(question)) {
      const assets = parseAssets(question);
      if (assets && assets.type === "crypto") {
        const prices = await fetchCryptoPrices(assets.ids);
        const answer = formatMarketResponse(assets, prices, lang);
        return new Response(JSON.stringify({ answer, type: "market" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (assets && assets.type === "traditional") {
        const answer = formatMarketResponse(assets, {}, lang);
        return new Response(JSON.stringify({ answer, type: "market" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- Intent: News / Narrative ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const timeRange = parseTimeRange(question);
    const categories = parseCategories(question);

    let query = supabase
      .from("articles")
      .select("title, summary, source, category, subtopic, published_at, signal_score, impact_level, url, badges")
      .order("published_at", { ascending: false })
      .limit(50);

    if (timeRange) {
      const since = new Date(Date.now() - timeRange.hours * 60 * 60 * 1000).toISOString();
      query = query.gte("published_at", since);
    }

    if (categories.length > 0) {
      query = query.in("category", categories);
    }

    const { data: articles, error: dbError } = await query;
    if (dbError) throw dbError;

    if (!articles || articles.length === 0) {
      const noDataMsg = lang === "th"
        ? "ไม่พบข่าวที่ตรงกับคำถามในช่วงเวลาที่ระบุ ลองเปลี่ยนช่วงเวลาหรือหมวดหมู่"
        : "No articles found matching your query. Try adjusting the time range or category.";
      return new Response(JSON.stringify({ answer: noDataMsg, articles: [], type: "news" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const articleContext = articles.map((a: any, i: number) =>
      `[${i + 1}] ${a.title}\nSource: ${a.source} | Category: ${a.category} | Signal: ${a.signal_score} | Impact: ${a.impact_level}\nPublished: ${a.published_at}\nSummary: ${a.summary}\nURL: ${a.url}`
    ).join("\n\n");

    const systemPrompt = lang === "th"
      ? `คุณคือ "Alice" ผู้ช่วยวิเคราะห์ข่าวการเงินมืออาชีพ สไตล์ Bloomberg Thai

กฎ:
- ตอบเป็นภาษาไทยเท่านั้น ยกเว้นชื่อเฉพาะ ตัวย่อ และตัวเลข (BTC, SEC, Fed, $1.8T)
- ตอบจากข้อมูลข่าวที่ให้มาเท่านั้น ห้ามใช้ความรู้ทั่วไป
- ใช้ภาษาสั้นกระชับ ตรงประเด็น
- อ้างอิงแหล่งข่าวเสมอ

รูปแบบคำตอบ (Markdown):
## [หัวข้อสรุปสั้นๆ]

[สรุป 1-2 ประโยค]

### ประเด็นสำคัญ
- จุดที่ 1
- จุดที่ 2
- จุดที่ 3

### แหล่งข่าว
- [ชื่อข่าว](URL) — แหล่งที่มา`
      : `You are "Alice", a professional financial news intelligence assistant, like a Bloomberg analyst.

Rules:
- Answer ONLY based on the provided news articles. Never use general knowledge.
- Be concise and direct.
- Always cite sources.

Response format (Markdown):
## [Short answer headline]

[1-2 sentence summary]

### Key Points
- Point 1
- Point 2
- Point 3

### Related Sources
- [Article title](URL) — Source name`;

    // Build messages array with conversation history
    const aiMessages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history (last 10 messages max)
    if (history && Array.isArray(history)) {
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === "user" || msg.role === "assistant") {
          aiMessages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    // Add current question with article context
    aiMessages.push({
      role: "user",
      content: `Question: ${question}\n\nRelevant news articles:\n\n${articleContext}`,
    });

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ask-alice error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
