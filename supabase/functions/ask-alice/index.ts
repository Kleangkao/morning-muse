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
      const trend = Number(change) >= 0 ? (lang === "th" ? "ขาขึ้น" : "Trending up") : (lang === "th" ? "ขาลง" : "Trending down");
      lines.push(`### ${assets.labels[id]} ${arrow}\n**${price}** (24h: ${sign}${change}%)\n${trend}`);
    }
    if (lines.length === 0) {
      return lang === "th" ? "⚠️ ไม่สามารถดึงข้อมูลราคาได้ในขณะนี้" : "⚠️ Unable to fetch price data at this time.";
    }
    const header = lang === "th" ? "## 📊 ภาพรวมตลาด" : "## 📊 Market Snapshot";
    const watchHeader = lang === "th" ? "### สิ่งที่ต้องจับตา" : "### What to Watch";
    const watchItems = lang === "th"
      ? "- แนวโน้มอัตราดอกเบี้ยและนโยบาย Fed\n- ปริมาณการซื้อขายและ sentiment ตลาด\n- ข่าวกฎระเบียบและ ETF flow"
      : "- Interest rate expectations and Fed policy\n- Trading volume and market sentiment\n- Regulatory news and ETF flow data";
    const riskNote = lang === "th"
      ? "\n\n### ⚠️ หมายเหตุความเสี่ยง\nคริปโตมีความผันผวนสูง ราคาอาจเปลี่ยนแปลงอย่างรวดเร็ว"
      : "\n\n### ⚠️ Risk Note\nCrypto assets are highly volatile. Prices can change rapidly.";
    const footer = lang === "th" ? "\n\n*ข้อมูลจาก CoinGecko*" : "\n\n*Data from CoinGecko*";
    return header + "\n\n" + lines.join("\n\n") + "\n\n" + watchHeader + "\n" + watchItems + riskNote + footer;
  }

  const note = lang === "th"
    ? "## 📊 ข้อมูลตลาด\n\n⚠️ ข้อมูลราคาเรียลไทม์สำหรับสินทรัพย์นี้ยังไม่เชื่อมต่อ\n\nระบบรองรับราคาเรียลไทม์สำหรับคริปโต (BTC, ETH, SOL ฯลฯ)\n\nสำหรับ Gold, Oil, Nasdaq — ลองถามเกี่ยวกับข่าวหรือการวิเคราะห์ที่เกี่ยวข้องแทน"
    : "## 📊 Market Data\n\n⚠️ Live market price is not currently connected for this asset.\n\nReal-time prices are available for crypto (BTC, ETH, SOL, etc.).\n\nFor Gold, Oil, Nasdaq — try asking about related news or analysis instead.";
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
  const BASE_PERSONA_EN = `You are "Alice", a modern AI investment briefing assistant — a mix of Perplexity, Morning Brew, and a simple Bloomberg morning desk.

Your role: help users understand markets quickly and clearly. You cover gold, bitcoin, crypto, stocks, oil, forex, interest rates, inflation, bonds, ETFs, and major market news.

Style rules:
- Clear, practical, calm, intelligent
- Beginner-friendly but useful for intermediate investors
- Prefer bullets over long paragraphs
- Use strong headings
- Keep answers compact unless asked for detail
- Highlight important numbers clearly
- Feel like a premium financial morning brief
- Never fabricate market numbers
- If live price data is not available, say so clearly — still answer using news context or general knowledge
- Never give absolute buy/sell commands — explain scenarios, risks, and key factors instead
- Be transparent when data is delayed, estimated, or unavailable`;

  const BASE_PERSONA_TH = `คุณคือ "Alice" ผู้ช่วยสรุปข่าวการลงทุนแบบ AI สไตล์ Perplexity + Morning Brew + Bloomberg Thai

บทบาท: ช่วยให้ผู้ใช้เข้าใจตลาดได้เร็วและชัดเจน ครอบคลุม ทองคำ, Bitcoin, คริปโต, หุ้น, น้ำมัน, Forex, อัตราดอกเบี้ย, เงินเฟ้อ, พันธบัตร, ETF และข่าวตลาดสำคัญ

กฎการตอบ:
- ตอบเป็นภาษาไทย ยกเว้นชื่อเฉพาะ ตัวย่อ ตัวเลข (BTC, SEC, Fed, $1.8T)
- ชัดเจน ใช้งานได้จริง สงบ ฉลาด
- เข้าใจง่ายสำหรับมือใหม่ แต่ยังมีคุณค่าสำหรับนักลงทุนระดับกลาง
- ใช้ bullet points แทนย่อหน้ายาว
- ใช้หัวข้อที่ชัดเจน
- ตอบกระชับ ยกเว้นผู้ใช้ขอรายละเอียดเพิ่ม
- เน้นตัวเลขสำคัญให้โดดเด่น
- ห้ามสร้างตัวเลขตลาดปลอม
- ถ้าไม่มีข้อมูลราคาเรียลไทม์ ให้บอกตรงๆ แล้วตอบจากข่าวหรือความรู้ทั่วไป
- ห้ามให้คำสั่งซื้อ/ขาย — อธิบายสถานการณ์ ความเสี่ยง และปัจจัยสำคัญแทน`;

  if (lang === "th") {
    let prompt = BASE_PERSONA_TH + "\n\n";

    if (intent === "knowledge") {
      prompt += `รูปแบบคำตอบ (Markdown):

## [หัวข้อ]

**คำตอบตรง:** [ตอบตรงๆ 1 ประโยค]

### สิ่งที่ควรรู้
- จุดที่ 1
- จุดที่ 2
- จุดที่ 3

### ทำไมถึงสำคัญ
- อธิบายสั้นๆ ว่าสิ่งนี้ส่งผลต่อการลงทุนอย่างไร

### สิ่งที่ต้องจับตา
- 2-4 ประเด็นที่ควรติดตาม`;
    } else if (intent === "market") {
      prompt += `รูปแบบคำตอบ (Markdown):

## [ชื่อสินทรัพย์] อัปเดต

**คำตอบตรง:** [สรุปสถานะ 1 ประโยค]

${hasMarketData ? "### 📊 ภาพรวมตลาด\n[แสดงราคาและการเปลี่ยนแปลง]\n\n" : "### 📊 ภาพรวมตลาด\n⚠️ ข้อมูลราคาเรียลไทม์ยังไม่เชื่อมต่อสำหรับสินทรัพย์นี้\n[ตอบจากบริบทข่าวหรือความรู้ทั่วไปแทน]\n\n"}### ทำไมถึงสำคัญ
- ปัจจัยขับเคลื่อนหลัก

### สิ่งที่ต้องจับตา
- 2-4 ประเด็น

### ⚠️ หมายเหตุความเสี่ยง
- สั้นๆ 1 ประโยคเกี่ยวกับความผันผวนหรือความไม่แน่นอน`;
    } else if (intent === "hybrid") {
      prompt += `รูปแบบคำตอบ (Markdown):

## [หัวข้อวิเคราะห์]

**คำตอบตรง:** [สรุป 1 ประโยค]

${hasMarketData ? "### 📊 ข้อมูลตลาด\n[แสดงราคาและการเปลี่ยนแปลง]\n\n" : ""}### ทำไมถึงเกิดขึ้น
- ปัจจัยขับเคลื่อนจากข่าวและตลาด

${hasArticles ? "### 📰 จากข่าว\n- ประเด็นจากข่าว\n\n" : ""}### 💡 บริบทเพิ่มเติม
- การวิเคราะห์เชิงลึก

### สิ่งที่ต้องจับตา
- 2-4 ประเด็น

### ⚠️ หมายเหตุความเสี่ยง
- ความไม่แน่นอนหรือความผันผวน

${hasArticles ? "### แหล่งข่าว\n- [ชื่อข่าว](URL) — แหล่งที่มา" : ""}`;
    } else {
      // news
      prompt += `รูปแบบคำตอบ (Markdown):

## [หัวข้อสรุปสั้นๆ]

**คำตอบตรง:** [สรุป 1 ประโยค]

### ประเด็นสำคัญ
- จุดที่ 1
- จุดที่ 2
- จุดที่ 3

### ทำไมถึงสำคัญ
- อธิบายผลกระทบต่อนักลงทุน

### สิ่งที่ต้องจับตา
- 2-4 ประเด็นที่ควรติดตาม

### แหล่งข่าว
- [ชื่อข่าว](URL) — แหล่งที่มา`;
    }
    return prompt;
  }

  // English
  let prompt = BASE_PERSONA_EN + "\n\n";

  if (intent === "knowledge") {
    prompt += `Response format (Markdown):

## [Topic Headline]

**Direct answer:** [One clear sentence]

### Key Concepts
- Point 1
- Point 2
- Point 3

### Why It Matters
- Brief explanation of investment relevance

### What to Watch
- 2-4 things to monitor`;
  } else if (intent === "market") {
    prompt += `Response format (Markdown):

## [Asset Name] Update

**Direct answer:** [One sentence status summary]

${hasMarketData ? "### 📊 Current Snapshot\n[Show price, 24h change, trend direction]\n\n" : "### 📊 Current Snapshot\n⚠️ Live market price is not currently connected for this asset.\n[Answer using latest news context or general market knowledge instead]\n\n"}### Why It Matters
- Key drivers in simple language

### What to Watch
- 2-4 things to monitor next

### ⚠️ Risk Note
- Brief note on volatility or uncertainty`;
  } else if (intent === "hybrid") {
    prompt += `Response format (Markdown):

## [Analysis Headline]

**Direct answer:** [One sentence summary]

${hasMarketData ? "### 📊 Market Snapshot\n[Show price and changes]\n\n" : ""}### Why This Is Happening
- Key drivers from news and market data

${hasArticles ? "### 📰 From the News\n- News-based insights\n\n" : ""}### 💡 Context
- Deeper analysis

### What to Watch
- 2-4 things to monitor

### ⚠️ Risk Note
- Uncertainty or volatility caveat

${hasArticles ? "### Sources\n- [Article title](URL) — Source name" : ""}`;
  } else {
    // news
    prompt += `Response format (Markdown):

## [Short Answer Headline]

**Direct answer:** [One sentence summary]

### Key Points
- Point 1
- Point 2
- Point 3

### Why It Matters
- Investment relevance explanation

### What to Watch
- 2-4 things to monitor

### Sources
- [Article title](URL) — Source name`;
  }

  // Asset-specific guidance
  prompt += `\n\nAsset-specific guidance:
- Gold: cover safe-haven demand, inflation, rates, dollar strength, geopolitical risk
- Bitcoin/Crypto: cover sentiment, ETF/news flow, regulation, macro liquidity, volatility
- Stocks: cover company move, earnings, guidance, sector context, macro backdrop
- Oil: cover supply risk, geopolitics, OPEC, demand outlook, inflation impact
- Forex: cover rate differentials, central banks, inflation, risk sentiment
- Interest rates/Fed: explain impact on gold, stocks, bonds, crypto, currencies
- General market summary: structure as Top Moves → Macro Drivers → Risk Sentiment → What to Watch`;

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
