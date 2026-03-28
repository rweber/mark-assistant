export const searchLeadsDef = {
  name: "search_leads" as const,
  description:
    "Search the web for potential leads matching the business's ideal customer profile. Returns structured search results with company names, descriptions, and potential contact info.",
  input_schema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description:
          "Search query to find potential leads. Be specific about industry, role, or company type.",
      },
    },
    required: ["query"] as string[],
  },
};

export async function searchLeads(input: {
  query: string;
}): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return JSON.stringify({
      error: "TAVILY_API_KEY not configured. Cannot search for leads.",
    });
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: input.query,
        search_depth: "advanced",
        max_results: 5,
        include_domains: [],
        exclude_domains: [],
      }),
    });

    if (!response.ok) {
      return JSON.stringify({
        error: `Search failed: ${response.status} ${response.statusText}`,
      });
    }

    const data = await response.json();
    const results = (data.results ?? []).map(
      (r: { title: string; url: string; content: string }) => ({
        title: r.title,
        url: r.url,
        snippet: r.content?.slice(0, 500),
      })
    );

    return JSON.stringify({ query: input.query, results });
  } catch (err) {
    return JSON.stringify({
      error: `Search error: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}
