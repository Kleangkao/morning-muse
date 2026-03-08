import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Time & Category Parsing ──

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

// ── Intent Detection ──

type Intent = "market" | "news" | "knowledge" | "hybrid";

const MARKET_PATTERNS = [
  /\b(price|ราคา)\b/i,
  /\b(how much|เท่าไหร่|เท่าไร)\b/i,
  /\b(btc|bitcoin|eth|ethereum|gold|ทองคำ|oil|น้ำมัน|nasdaq|s&p|sp500|dow|ดาวโจนส์)\s*(price|ราคา|now|ตอนนี้|today|วันนี้)?\b/i,
  /\b(price|ราคา)\s*(of|ของ)?\s*(btc|bitcoin|eth|ethereum|gold|ทองคำ|oil|น้ำมัน)\b/i,
];

const KNOWLEDGE_PATTERNS = [
  /\b(what is|what are|what's|อะไรคือ|คืออะไร|หมายความว่า|explain|อธิบาย|how does|ทำงานยังไง|วิธี)\b/i,
  /\b(definition|meaning|concept|นิยาม|ความหมาย|แนวคิด)\b/i,
  /\b(difference between|เปรียบเทียบ|ต่างกัน)\b/i,
  /\b(prediction market|staking|DeFi|yield farming|ETF|PE ratio|market cap|halving)\b/i,
];

const NEWS_PATTERNS = [
  /\b(news|ข่าว|happened|เกิดอะไร|update|อัพเดท|latest|ล่าสุด|summarize|สรุป)\b/i,
  /\b(last|past|today|วันนี้|เมื่อวาน|yesterday|ชั่วโมง|hours?|days?|วัน)\b/i,
];

const HYBRID_PATTERNS = [
  /\b(why is|why are|ทำไม|เพราะอะไร|สาเหตุ)\b/i,
  /\b(going up|going down|ขึ้น|ลง|rally|crash|dump|pump|drop|surge)\b/i,
  /\b(impact|affect|ผลกระทบ|ส่งผล|outlook|แนวโน้ม|forecast|คาดการณ์)\b/i,
  /\b(narrative|เทรนด์|trend|theme|ธีม)\b/i,
];

function detectIntent(query: string): Intent {
  const q = query.toLowerCase();
  const isMarket = MARKET_PATTERNS.some(p => p.test(q));
  const isNews = NEWS_PATTERNS.some(p => p.test(q));
  const isKnowledge = KNOWLEDGE_PATTERNS.some(p => p.test(q));
  const isHybrid = HYBRID_PATTERNS.some(p => p.test(q));

  // Pure market price query
  if (isMarket && !isNews && !isHybrid) return "market";
  // Hybrid: "why is BTC going up" — needs market + news + reasoning
  if (isHybrid || (isMarket && isNews)) return "hybrid";
  // Pure knowledge: "what is a prediction market"
  if (isKnowledge && !isNews) return "knowledge";
  // Default: news
  return "news";
}

// ── Market Data ──

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

  const tradIds: string[] = [];
  if (/\b(gold|ทองคำ|ทอง|xau)\b/.test(q)) { tradIds.push("gold"); labels["gold"] = "Gold"; }
  if (/\b(oil|น้ำมัน|crude|wti|brent)\b/.test(q)) { tradIds.push("oil"); labels["oil"] = "Crude Oil"; }
  if (/\b(nasdaq)\b/.test(q)) { tradIds.push("nasdaq"); labels["nasdaq"] = "NASDAQ"; }
  if (/\b(s&p|sp500|sp 500)\b/.test(q)) { tradIds.push("sp500"); labels["sp500"] = "S&P 500"; }
  if (/\b(dow|ดาวโจนส์)\b/.test(q)) { tradIds.push("dow"); labels["dow"] = "Dow Jones"; }

  if (tradIds.length > 0) return { type: "traditional", ids: tradIds, labels };

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

  const note = lang === "th"
    ? "## 📊 ข้อมูลตลาด\n\nขณะนี้ระบบรองรับราคาเรียลไทม์สำหรับคริปโตเท่านั้น (BTC, ETH, SOL ฯลฯ)\n\nสำหรับข้อมูล Gold, Oil, Nasdaq กรุณาถามเกี่ยวกับข่าวที่เกี่ยวข้องแทน"
    : "## 📊 Market Data\n\nReal-time prices are currently available for crypto assets (BTC, ETH, SOL, etc.).\n\nFor Gold, Oil, Nasdaq — try asking about related news instead.";
  return note;
}

// ── Article Fetching ──

async function fetchArticles(supabase: any, question: string, categories: string[], timeRange: { hours: number } | null) {
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

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

function formatArticleContext(articles: any[]): string {
  return articles.map((a: any, i: number) =>
    `[${i + 1}] ${a.title}\nSource: ${a.source} | Category: ${a.category} | Signal: ${a.signal_score} | Impact: ${a.impact_level}\nPublished: ${a.published_at}\nSummary: ${a.summary}\nURL: ${a.url}`
  ).join("\n\n");
}

// ── System Prompts ──

function getSystemPrompt(intent: Intent, lang: string, hasArticles: boolean, hasMarketData: boolean): string {
  const intentLabel: Record<Intent, { en: string; th: string }> = {
    news: { en: "📰 News Summary", th: "📰 สรุปข่าว" },
    market: { en: "📊 Market Data", th: "📊 ข้อมูลตลาด" },
    knowledge: { en: "📚 Background", th: "📚 ความรู้พื้นฐาน" },
    hybrid: { en: "🔍 Analysis", th: "🔍 วิเคราะห์" },
  };

  const label = lang === "th" ? intentLabel[intent].th : intentLabel[intent].en;

  if (lang === "th") {
    let prompt = `คุณคือ "Alice" ผู้ช่วยวิเคราะห์ข่าวการเงินมืออาชีพ สไตล์ Bloomberg Thai\n\n`;

    if (intent === "knowledge") {
      prompt += `กฎ:
- ตอบเป็นภาษาไทย ยกเว้นชื่อเฉพาะ ตัวย่อ และตัวเลข
- อธิบายอย่างชัดเจนและเข้าใจง่าย ใช้ภาษาที่นักลงทุนไทยคุ้นเคย
- สามารถใช้ความรู้ทั่วไปของคุณได้
- ใช้ภาษาสั้นกระชับ ตรงประเด็น

ขึ้นต้นคำตอบด้วย: **${label}**

รูปแบบ (Markdown):
## [หัวข้อ]

[คำอธิบาย 2-3 ประโยค]

### สิ่งที่ควรรู้
- จุดที่ 1
- จุดที่ 2
- จุดที่ 3`;
    } else if (intent === "hybrid") {
      prompt += `กฎ:
- ตอบเป็นภาษาไทย ยกเว้นชื่อเฉพาะ ตัวย่อ และตัวเลข
- วิเคราะห์โดยรวมข้อมูลจากทุกแหล่ง: ข่าว, ข้อมูลตลาด, และความรู้ทั่วไป
- ระบุชัดเจนว่าข้อมูลส่วนไหนมาจากแหล่งไหน
- ใช้ภาษาสั้นกระชับ ตรงประเด็น

ขึ้นต้นคำตอบด้วย: **${label}**

รูปแบบ (Markdown):
## [หัวข้อวิเคราะห์]

[สรุป 1-2 ประโยค]

${hasMarketData ? "### 📊 ข้อมูลตลาด\n[แสดงราคาและการเปลี่ยนแปลง]\n\n" : ""}### 📰 จากข่าว
- ประเด็นจากข่าว 1
- ประเด็นจากข่าว 2

### 💡 บริบทเพิ่มเติม
- การวิเคราะห์เชิงลึก

### แหล่งข่าว
- [ชื่อข่าว](URL) — แหล่งที่มา`;
    } else {
      prompt += `กฎ:
- ตอบเป็นภาษาไทยเท่านั้น ยกเว้นชื่อเฉพาะ ตัวย่อ และตัวเลข (BTC, SEC, Fed, $1.8T)
- ตอบจากข้อมูลข่าวที่ให้มาเป็นหลัก
- ใช้ภาษาสั้นกระชับ ตรงประเด็น
- อ้างอิงแหล่งข่าวเสมอ

ขึ้นต้นคำตอบด้วย: **${label}**

รูปแบบ (Markdown):
## [หัวข้อสรุปสั้นๆ]

[สรุป 1-2 ประโยค]

### ประเด็นสำคัญ
- จุดที่ 1
- จุดที่ 2
- จุดที่ 3

### แหล่งข่าว
- [ชื่อข่าว](URL) — แหล่งที่มา`;
    }
    return prompt;
  }

  // English
  let prompt = `You are "Alice", a professional financial intelligence assistant, like a Bloomberg analyst.\n\n`;

  if (intent === "knowledge") {
    prompt += `Rules:
- Provide clear, accessible explanations using your general knowledge.
- Write like a financial analyst explaining to an informed investor.
- Be concise and direct.

Start your answer with: **${label}**

Response format (Markdown):
## [Topic headline]

[2-3 sentence explanation]

### Key Concepts
- Point 1
- Point 2
- Point 3`;
  } else if (intent === "hybrid") {
    prompt += `Rules:
- Combine news data, market data, and general knowledge to give a comprehensive answer.
- Clearly attribute which insights come from which source.
- Be concise and direct.
- Always cite news sources when referencing articles.

Start your answer with: **${label}**

Response format (Markdown):
## [Analysis headline]

[1-2 sentence summary]

${hasMarketData ? "### 📊 Market Data\n[Show price and changes]\n\n" : ""}### 📰 From the News
- News-based insight 1
- News-based insight 2

### 💡 Context
- Deeper analysis point

### Related Sources
- [Article title](URL) — Source name`;
  } else {
    prompt += `Rules:
- Answer based on the provided news articles.
- Be concise and direct.
- Always cite sources.

Start your answer with: **${label}**

Response format (Markdown):
## [Short answer headline]

[1-2 sentence summary]

### Key Points
- Point 1
- Point 2
- Point 3

### Related Sources
- [Article title](URL) — Source name`;
  }
  return prompt;
}

// ── Main Handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, lang, history } = await req.json();
    if (!question) throw new Error("No question provided");

    const intent = detectIntent(question);
    console.log(`[Ask Alice] Intent: ${intent} | Question: ${question}`);

    // ── Pure Market Data ──
    if (intent === "market") {
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

    // ── AI-powered responses (news, knowledge, hybrid) ──
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let articleContext = "";
    let marketContext = "";
    let hasArticles = false;
    let hasMarketData = false;

    // Fetch articles for news and hybrid intents
    if (intent === "news" || intent === "hybrid") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const timeRange = parseTimeRange(question);
      const categories = parseCategories(question);
      const articles = await fetchArticles(supabase, question, categories, timeRange);

      if (articles.length > 0) {
        articleContext = formatArticleContext(articles);
        hasArticles = true;
      } else if (intent === "news") {
        // No articles found for a news query — fall back to knowledge
        console.log("[Ask Alice] No articles found, falling back to knowledge intent");
      }
    }

    // Fetch market data for hybrid intent
    if (intent === "hybrid") {
      const assets = parseAssets(question);
      if (assets && assets.type === "crypto") {
        const prices = await fetchCryptoPrices(assets.ids);
        if (Object.keys(prices).length > 0) {
          hasMarketData = true;
          const lines: string[] = [];
          for (const id of assets.ids) {
            const p = prices[id];
            if (!p) continue;
            const price = p.usd?.toLocaleString("en-US", { style: "currency", currency: "USD" });
            const change = p.usd_24h_change?.toFixed(2);
            const sign = Number(change) >= 0 ? "+" : "";
            lines.push(`${assets.labels[id]}: ${price} (24h: ${sign}${change}%)`);
          }
          marketContext = lines.join("\n");
        }
      }
    }

    const effectiveIntent = (intent === "news" && !hasArticles) ? "knowledge" as Intent : intent;
    const systemPrompt = getSystemPrompt(effectiveIntent, lang, hasArticles, hasMarketData);

    // Build messages
    const aiMessages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    if (history && Array.isArray(history)) {
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === "user" || msg.role === "assistant") {
          aiMessages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    // Build user message with context
    let userContent = `Question: ${question}`;
    if (marketContext) {
      userContent += `\n\nCurrent market data:\n${marketContext}`;
    }
    if (articleContext) {
      userContent += `\n\nRelevant news articles:\n\n${articleContext}`;
    }
    if (effectiveIntent === "knowledge" && !hasArticles && !marketContext) {
      userContent += `\n\n(No articles found in the database for this query. Answer using your general knowledge as a financial analyst.)`;
    }

    aiMessages.push({ role: "user", content: userContent });

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
