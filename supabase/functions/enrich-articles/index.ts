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
  const langLabel = lang === 'th' ? 'Thai' : 'English';

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: `You are a senior financial intelligence analyst writing a concise briefing. Write entirely in ${langLabel}. Do NOT include RSS feed text or raw excerpts. Synthesize the information into an original, high-signal analysis.` },
        { role: 'user', content: `Article: "${article.title}" from ${article.source} (${article.category}/${article.subtopic})\nContext: ${article.summary}\n\nWrite an original analysis (do NOT copy the summary above). Structure:\n1. Three short paragraphs (2-3 sentences each):\n   - Paragraph 1: What happened (the core event or development)\n   - Paragraph 2: Why it matters (market/industry implications)\n   - Paragraph 3: What could happen next (outlook, risks, opportunities)\n2. 3-4 key takeaway bullet points (concise, actionable)\n\nReturn JSON: { "paragraphs": ["...", "...", "..."], "takeaways": ["...", "...", "..."] }` },
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
  const langLabel = lang === 'th' ? 'Thai' : 'English';

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: `You are a financial intelligence briefing assistant. Write entirely in ${langLabel}. Be ultra-concise, high-signal, easy to skim in 30 seconds. Focus on immediate updates, not thematic patterns.` },
        { role: 'user', content: `Today's top stories:\n${briefData.top}\n\nCreate a quick scan brief with 5-8 bullet points covering:\n- Key events that happened today across AI, crypto, macro, tech, commodities\n- Notable price moves or data releases\n- Each bullet: 1 sentence max, direct and factual\n\nReturn JSON: { "bullets": ["...", "..."] }` },
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

// ─── Default Enrichment Handler ───
// Generates BOTH English and Thai versions for all articles
async function handleEnrichment(body: any, apiKey: string) {
  const { articles } = body as { articles: ArticleSummary[] };
  if (!articles?.length) {
    return new Response(JSON.stringify({ thaiTitles: {}, thaiSummaries: {}, narratives: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Process up to 50 articles for translation
  const topArticles = articles.slice(0, 50);
  const articleList = topArticles.map((a, i) =>
    `[${i + 1}] ID:${a.id} | ${a.category}/${a.subtopic} | ${a.title}\n   ${a.summary}`
  ).join('\n\n');

  const systemPrompt = `You are a financial intelligence analyst providing bilingual content.

For each article, you must provide BOTH English and Thai versions:
1. thaiTitles: Thai translation of each headline (concise, natural Thai)
2. thaiSummaries: Thai translation of each summary (1-2 sentences, market-relevant)

Additionally, identify 2-5 emerging narratives by grouping related articles. For each narrative:
- title: Narrative title in English
- titleTh: Narrative title in Thai
- whyItMatters: English explanation (1-2 sentences)
- whyItMattersTh: Thai explanation (1-2 sentences)
- momentum: "Hot" if 3+ articles, "Rising" if 2+, "Watchlist" if emerging
- category: primary category (ai, crypto, investment, macro, tech-stocks, commodities)
- articleIds: array of article IDs in this narrative

Translation quality is critical. Thai translations must be:
- Natural Thai phrasing, not word-for-word translation
- Appropriate financial terminology
- Concise and readable

You MUST use the provided tool to return structured output.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here are today's top articles:\n\n${articleList}` },
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'return_bilingual_enrichment',
          description: 'Return Thai translations and narratives with bilingual content',
          parameters: {
            type: 'object',
            properties: {
              thaiTitles: { 
                type: 'object', 
                additionalProperties: { type: 'string' },
                description: 'Map of article ID to Thai headline translation'
              },
              thaiSummaries: { 
                type: 'object', 
                additionalProperties: { type: 'string' },
                description: 'Map of article ID to Thai summary translation'
              },
              narratives: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: 'English narrative title' },
                    titleTh: { type: 'string', description: 'Thai narrative title' },
                    whyItMatters: { type: 'string', description: 'English explanation' },
                    whyItMattersTh: { type: 'string', description: 'Thai explanation' },
                    momentum: { type: 'string', enum: ['Rising', 'Hot', 'Watchlist'] },
                    articleIds: { type: 'array', items: { type: 'string' } },
                    category: { type: 'string' },
                  },
                  required: ['title', 'titleTh', 'whyItMatters', 'whyItMattersTh', 'momentum', 'articleIds', 'category'],
                },
              },
            },
            required: ['thaiTitles', 'thaiSummaries', 'narratives'],
          },
        },
      }],
      tool_choice: { type: 'function', function: { name: 'return_bilingual_enrichment' } },
    }),
  });

  if (!response.ok) {
    console.error('AI gateway error:', response.status);
    return new Response(JSON.stringify({ thaiTitles: {}, thaiSummaries: {}, narratives: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

  if (!toolCall?.function?.arguments) {
    return new Response(JSON.stringify({ thaiTitles: {}, thaiSummaries: {}, narratives: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const parsed = JSON.parse(toolCall.function.arguments);
  const narratives = (parsed.narratives || []).map((n: any, i: number) => ({
    ...n,
    id: `nar-live-${i}`,
    articleCount: n.articleIds?.length || 0,
  }));

  console.log(`[Enrichment] Generated ${Object.keys(parsed.thaiTitles || {}).length} Thai titles, ${narratives.length} narratives`);

  return new Response(
    JSON.stringify({ 
      thaiTitles: parsed.thaiTitles || {}, 
      thaiSummaries: parsed.thaiSummaries || {}, 
      narratives 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
