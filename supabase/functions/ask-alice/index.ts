import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseTimeRange(query: string): { hours: number } | null {
  const q = query.toLowerCase();
  const hourMatch = q.match(/(?:last|past)\s+(\d+)\s*(?:hours?|hrs?|h)/);
  if (hourMatch) return { hours: parseInt(hourMatch[1]) };
  const dayMatch = q.match(/(?:last|past)\s+(\d+)\s*(?:days?|d)/);
  if (dayMatch) return { hours: parseInt(dayMatch[1]) * 24 };
  if (q.includes("today") || q.includes("วันนี้")) return { hours: 24 };
  if (q.includes("yesterday") || q.includes("เมื่อวาน")) return { hours: 48 };
  // Default to last 24 hours if no time specified
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, lang } = await req.json();
    if (!question) throw new Error("No question provided");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse query intent
    const timeRange = parseTimeRange(question);
    const categories = parseCategories(question);

    // Build query
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
        ? "ไม่พบข่าวที่ตรงกับคำถามของคุณในช่วงเวลาที่ระบุ ลองเปลี่ยนช่วงเวลาหรือหมวดหมู่"
        : "No articles found matching your query in the specified time range. Try adjusting the time range or category.";
      return new Response(JSON.stringify({ answer: noDataMsg, articles: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context from articles
    const articleContext = articles.map((a, i) => 
      `[${i + 1}] ${a.title}\nSource: ${a.source} | Category: ${a.category} | Signal: ${a.signal_score} | Impact: ${a.impact_level}\nPublished: ${a.published_at}\nSummary: ${a.summary}\nURL: ${a.url}`
    ).join("\n\n");

    const systemPrompt = lang === "th"
      ? `คุณคือ "Alice" ผู้ช่วยวิเคราะห์ข่าวการเงินแบบมืออาชีพ คล้ายนักวิเคราะห์ที่ Bloomberg Thai

กฎ:
- ตอบเป็นภาษาไทยเท่านั้น ยกเว้นชื่อเฉพาะ ตัวย่อ และตัวเลข (BTC, SEC, Fed, $1.8T)
- ตอบจากข้อมูลข่าวที่ให้มาเท่านั้น ห้ามใช้ความรู้ทั่วไป
- ใช้ภาษาสั้นกระชับ ตรงประเด็น เหมือนสำนักข่าวการเงินไทย
- อ้างอิงแหล่งข่าวเสมอ

รูปแบบคำตอบ (ใช้ Markdown):
## [หัวข้อสรุปสั้นๆ]

[สรุป 1-2 ประโยค]

### ประเด็นสำคัญ
- จุดที่ 1
- จุดที่ 2
- จุดที่ 3
(3-6 จุด)

### แหล่งข่าวที่เกี่ยวข้อง
- [ชื่อข่าว](URL) — แหล่งที่มา`
      : `You are "Alice", a professional financial news intelligence assistant, similar to a Bloomberg analyst.

Rules:
- Answer ONLY based on the provided news articles. Never use general knowledge.
- Be concise and direct, like a financial news brief.
- Always cite sources.

Response format (use Markdown):
## [Short answer headline]

[1-2 sentence summary]

### Key Points
- Point 1
- Point 2
- Point 3
(3-6 bullet points)

### Related Sources
- [Article title](URL) — Source name`;

    const userPrompt = `Question: ${question}\n\nHere are the relevant news articles:\n\n${articleContext}`;

    // Call AI gateway (streaming)
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
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
