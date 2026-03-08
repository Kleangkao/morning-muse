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

    // ─── Mode: Article Detail ───
    if (body.mode === 'detail') {
      return handleDetail(body, LOVABLE_API_KEY);
    }

    // ─── Mode: Quick Scan ───
    if (body.mode === 'quickscan') {
      return handleQuickScan(body, LOVABLE_API_KEY);
    }

    // ─── Default: Enrichment (Thai titles, summaries, narratives) ───
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
        { role: 'system', content: `You are a financial intelligence analyst. Write in ${langLabel}. Be concise, high-signal, market-relevant.` },
        { role: 'user', content: `Article: "${article.title}" from ${article.source} (${article.category}/${article.subtopic})\nSummary: ${article.summary}\n\nWrite:\n1. A 3-paragraph detailed summary (each ~2-3 sentences, covering what happened, why it matters, market implications)\n2. 3-5 key takeaways as bullet points\n\nReturn JSON: { "paragraphs": [...], "takeaways": [...] }` },
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
        { role: 'system', content: `You are a financial intelligence briefing assistant. Write in ${langLabel}. Be ultra-concise, high-signal, easy to skim in 30 seconds.` },
        { role: 'user', content: `Today's top stories:\n${briefData.top}\n\nActive narratives: ${briefData.narrs}\n\nCreate a daily intelligence brief with 5-8 bullet points covering:\n- What happened today across AI, crypto, macro, tech, commodities, investment\n- Notable market shifts or narratives\n- Each bullet: 1-2 sentences max, actionable insight\n\nReturn JSON: { "bullets": ["...", "..."] }` },
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
async function handleEnrichment(body: any, apiKey: string) {
  const { articles } = body as { articles: ArticleSummary[] };
  if (!articles?.length) {
    return new Response(JSON.stringify({ thaiTitles: {}, thaiSummaries: {}, narratives: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const topArticles = articles.slice(0, 20);
  const articleList = topArticles.map((a, i) =>
    `[${i + 1}] ID:${a.id} | ${a.category}/${a.subtopic} | ${a.title}\n   ${a.summary}`
  ).join('\n\n');

  const systemPrompt = `You are a financial intelligence analyst. You will receive a list of news articles.

Your tasks:
1. For each article, translate the headline into Thai. Keep it natural and concise.
2. For each article, write a 1-2 sentence Thai summary focused on market relevance.
3. Identify 2-5 emerging narratives by grouping related articles. For each narrative provide:
   - A compelling title (in English)
   - A "whyItMatters" explanation (in Thai, 1-2 sentences)
   - momentum: "Hot" if 3+ articles and very current, "Rising" if 2+ articles, "Watchlist" if emerging

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
          name: 'return_enrichment',
          description: 'Return Thai titles, Thai summaries, and detected narratives',
          parameters: {
            type: 'object',
            properties: {
              thaiTitles: { type: 'object', additionalProperties: { type: 'string' } },
              thaiSummaries: { type: 'object', additionalProperties: { type: 'string' } },
              narratives: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    whyItMatters: { type: 'string' },
                    momentum: { type: 'string', enum: ['Rising', 'Hot', 'Watchlist'] },
                    articleIds: { type: 'array', items: { type: 'string' } },
                    category: { type: 'string' },
                  },
                  required: ['title', 'whyItMatters', 'momentum', 'articleIds', 'category'],
                },
              },
            },
            required: ['thaiTitles', 'thaiSummaries', 'narratives'],
          },
        },
      }],
      tool_choice: { type: 'function', function: { name: 'return_enrichment' } },
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

  return new Response(
    JSON.stringify({ thaiTitles: parsed.thaiTitles || {}, thaiSummaries: parsed.thaiSummaries || {}, narratives }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
