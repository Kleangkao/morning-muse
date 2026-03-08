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

interface EnrichedResult {
  thaiTitles: Record<string, string>;
  thaiSummaries: Record<string, string>;
  narratives: Array<{
    id: string;
    title: string;
    whyItMatters: string;
    articleCount: number;
    category: string;
    momentum: 'Rising' | 'Hot' | 'Watchlist';
    articleIds: string[];
  }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articles } = await req.json() as { articles: ArticleSummary[] };
    if (!articles?.length) {
      return new Response(JSON.stringify({ thaiTitles: {}, thaiSummaries: {}, narratives: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
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
1. For each article, translate the headline into Thai. Keep it natural and concise — a Thai reader should immediately understand the topic.
2. For each article, write a 1-2 sentence Thai summary focused on market relevance. Be concise, high-signal, easy to scan. Use professional Thai financial language.
3. Identify 2-5 emerging narratives by grouping related articles. For each narrative provide:
   - A compelling title (in English)
   - A "whyItMatters" explanation (in Thai, 1-2 sentences)
   - momentum: "Hot" if 3+ articles and very current, "Rising" if 2+ articles, "Watchlist" if emerging

You MUST use the provided tool to return structured output.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
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
                thaiTitles: {
                  type: 'object',
                  description: 'Map of article ID to Thai translated headline',
                  additionalProperties: { type: 'string' },
                },
                thaiSummaries: {
                  type: 'object',
                  description: 'Map of article ID to Thai summary string',
                  additionalProperties: { type: 'string' },
                },
                narratives: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      whyItMatters: { type: 'string', description: 'In Thai language' },
                      momentum: { type: 'string', enum: ['Rising', 'Hot', 'Watchlist'] },
                      articleIds: { type: 'array', items: { type: 'string' } },
                      category: { type: 'string' },
                    },
                    required: ['title', 'whyItMatters', 'momentum', 'articleIds', 'category'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['thaiTitles', 'thaiSummaries', 'narratives'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'return_enrichment' } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI gateway error:', response.status, errText);
      return new Response(JSON.stringify({ thaiTitles: {}, thaiSummaries: {}, narratives: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error('No tool call in response');
      return new Response(JSON.stringify({ thaiTitles: {}, thaiSummaries: {}, narratives: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments) as EnrichedResult;

    const narratives = (parsed.narratives || []).map((n, i) => ({
      ...n,
      id: `nar-live-${i}`,
      articleCount: n.articleIds?.length || 0,
    }));

    return new Response(
      JSON.stringify({
        thaiTitles: parsed.thaiTitles || {},
        thaiSummaries: parsed.thaiSummaries || {},
        narratives,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Enrichment error:', error);
    return new Response(
      JSON.stringify({ thaiTitles: {}, thaiSummaries: {}, narratives: [], error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
