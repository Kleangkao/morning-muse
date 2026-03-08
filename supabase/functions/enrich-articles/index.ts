const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ArticleSummary {
  id: string;
  title: string;
  summary: string;
  category: string;
  subtopic: string;
}

const THAI_FINANCIAL_STYLE = `You are a Thai financial journalist at Bloomberg Thai.
Write in natural, professional Thai like Thai financial media.

Rules:
- Do NOT translate literally word-by-word
- Rewrite headlines to sound punchy and natural in Thai
- Keep proper nouns, tickers, numbers as-is: BTC, SEC, Fed, $1.8T, NVIDIA
- Use vocabulary common in Thai financial media
- Short sentences, easy to scan
- 1-2 sentences max for summaries`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'No API key' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (body.mode === 'detail') return handleDetail(body, LOVABLE_API_KEY);
    if (body.mode === 'quickscan') return handleQuickScan(body, LOVABLE_API_KEY);
    return handleEnrichment(body, LOVABLE_API_KEY);
  } catch (error) {
    console.error('Enrichment error:', error);
    return new Response(
      JSON.stringify({ thaiTitles: {}, thaiSummaries: {}, narratives: [], error: error instanceof Error ? error.message : 'Unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ─── Article Detail Handler ───
async function handleDetail(body: any, apiKey: string) {
  const { article, lang } = body;
  
  const systemPrompt = lang === 'th'
    ? `You are a senior Thai financial analyst writing a concise briefing in Thai.
Write like Thai financial media (Bloomberg Thai style).
Do NOT translate literally — rewrite naturally in Thai.
Keep tickers, numbers, proper nouns as-is: BTC, Fed, NVIDIA, $1.8T.
Short sentences, professional tone, easy to scan.`
    : `You are a senior financial intelligence analyst writing a concise briefing in English.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Article: "${article.title}" from ${article.source} (${article.category}/${article.subtopic})\nContext: ${article.summary}\n\nWrite an original analysis. Structure:\n1. Three short paragraphs (2-3 sentences each):\n   - What happened\n   - Why it matters\n   - What could happen next\n2. 3-4 key takeaway bullet points\n\nReturn JSON: { "paragraphs": ["...", "...", "..."], "takeaways": ["...", "...", "..."] }` },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    return new Response(JSON.stringify({ paragraphs: [article.summary], takeaways: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  try {
    const parsed = JSON.parse(content);
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch {
    return new Response(JSON.stringify({ paragraphs: [article.summary], takeaways: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── Quick Scan Handler ───
async function handleQuickScan(body: any, apiKey: string) {
  const { briefData, lang } = body;
  
  const systemPrompt = lang === 'th'
    ? `You are a Thai financial briefing assistant.
Write in natural Thai like Bloomberg Thai or Setthasat.
Ultra-concise, high-signal, easy to skim in 30 seconds.
Keep tickers and numbers as-is: BTC, ETH, Fed, $1.8T.
Short sentences. No literal translations.`
    : `You are a financial intelligence briefing assistant. Be ultra-concise, high-signal, easy to skim in 30 seconds.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Today's top stories:\n${briefData.top}\n\nCreate a quick scan brief with 5-8 bullet points:\n- Key events across AI, crypto, macro, tech, commodities\n- Notable price moves or data releases\n- Each bullet: 1 sentence max, direct and factual\n\nReturn JSON: { "bullets": ["...", "..."] }` },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    return new Response(JSON.stringify({ bullets: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  try {
    const parsed = JSON.parse(content);
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch {
    return new Response(JSON.stringify({ bullets: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

// ─── Translate a batch of articles (max ~10) ───
async function translateBatch(articles: ArticleSummary[], apiKey: string): Promise<{ thaiTitles: Record<string, string>; thaiSummaries: Record<string, string> }> {
  const articleList = articles.map((a, i) =>
    `[${i + 1}] ID:${a.id} | ${a.title} | ${a.summary}`
  ).join('\n');

  const ids = articles.map(a => a.id);

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: `${THAI_FINANCIAL_STYLE}

Examples:
Original: "USDC beats Tether as stablecoin transfer volume hits $1.8T"
Bad Thai: "USDC ชนะ Tether เมื่อปริมาณการโอน stablecoin ถึง 1.8 ล้านล้านดอลลาร์"
Good Thai: "USDC แซง USDT หลังปริมาณโอน Stablecoin แตะ $1.8T"

Return ONLY valid JSON.` },
        { role: 'user', content: `Rewrite these ${articles.length} articles in natural Thai. Return JSON:
{
  "thaiTitles": { "${ids[0]}": "Thai headline", ... },
  "thaiSummaries": { "${ids[0]}": "Thai summary (1-2 sentences)", ... }
}

Articles:
${articleList}` },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    console.error(`[Batch] AI error: ${response.status}`);
    return { thaiTitles: {}, thaiSummaries: {} };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  try {
    const parsed = JSON.parse(content);
    return {
      thaiTitles: parsed.thaiTitles || {},
      thaiSummaries: parsed.thaiSummaries || {},
    };
  } catch (e) {
    console.error('[Batch] Parse error:', e);
    return { thaiTitles: {}, thaiSummaries: {} };
  }
}

// ─── Default Enrichment Handler ───
async function handleEnrichment(body: any, apiKey: string) {
  const { articles } = body as { articles: ArticleSummary[] };
  if (!articles?.length) {
    return new Response(JSON.stringify({ thaiTitles: {}, thaiSummaries: {}, narratives: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const topArticles = articles.slice(0, 50);

  // Split into batches of 10 to avoid JSON truncation
  const BATCH_SIZE = 10;
  const batches: ArticleSummary[][] = [];
  for (let i = 0; i < topArticles.length; i += BATCH_SIZE) {
    batches.push(topArticles.slice(i, i + BATCH_SIZE));
  }

  // Process all batches in parallel
  const batchResults = await Promise.all(
    batches.map(batch => translateBatch(batch, apiKey))
  );

  // Merge all batch results
  const allThaiTitles: Record<string, string> = {};
  const allThaiSummaries: Record<string, string> = {};
  for (const result of batchResults) {
    Object.assign(allThaiTitles, result.thaiTitles);
    Object.assign(allThaiSummaries, result.thaiSummaries);
  }

  console.log(`[Enrichment] Generated ${Object.keys(allThaiTitles).length} Thai titles from ${batches.length} batches`);

  // Generate narratives separately with top 20 articles
  let narratives: any[] = [];
  try {
    const narrativeArticles = topArticles.slice(0, 20);
    const narrativeList = narrativeArticles.map((a, i) =>
      `[${i + 1}] ${a.category}/${a.subtopic} | ${a.title}`
    ).join('\n');

    const narrativeResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: `Identify 2-5 emerging narrative themes from financial news.
For Thai titles and explanations: write naturally like Thai financial media.
Do NOT translate literally. Keep tickers/numbers as-is.
Return JSON only.` },
          { role: 'user', content: `Articles:\n${narrativeList}\n\nReturn JSON: { "narratives": [{ "title": "English title", "titleTh": "Natural Thai title", "whyItMatters": "English explanation", "whyItMattersTh": "Natural Thai explanation", "momentum": "Hot|Rising|Watchlist", "articleIds": ["id1"], "category": "ai|crypto|investment|macro|tech-stocks|commodities" }] }` },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (narrativeResponse.ok) {
      const narData = await narrativeResponse.json();
      const narContent = narData.choices?.[0]?.message?.content;
      const narParsed = JSON.parse(narContent);
      narratives = (narParsed.narratives || []).map((n: any, i: number) => ({
        ...n,
        id: `nar-live-${i}`,
        articleCount: n.articleIds?.length || 0,
      }));
    }
  } catch (e) {
    console.error('[Narratives] Error:', e);
  }

  return new Response(
    JSON.stringify({ thaiTitles: allThaiTitles, thaiSummaries: allThaiSummaries, narratives }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
