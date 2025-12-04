import { NextRequest, NextResponse } from "next/server";

interface Article {
  title: string;
  description: string;
  source: { name: string };
  url: string;
  publishedAt: string;
}

interface AnalysisResult {
  summary: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  conflicts: {
    title: string;
    source: string;
    description: string;
    severity: string;
    url?: string;
  }[];
  recommendations: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchTerms, articles } = body as {
      searchTerms: string;
      articles: Article[];
    };

    if (!articles || articles.length === 0) {
      return NextResponse.json({
        summary: "No news articles found for the provided search terms.",
        riskLevel: "LOW",
        conflicts: [],
        recommendations: [
          "Consider expanding search terms to include more variations",
          "Check for potential misspellings in the entity names",
          "Monitor for future news developments",
        ],
      } as AnalysisResult);
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured. Please add it to your .env.local file." },
        { status: 500 }
      );
    }

    // Use OpenAI for analysis
    const prompt = `You are a legal conflict of interest analyst for a law firm. Your job is to analyze news articles about "${searchTerms}" to identify information that would be relevant when deciding whether the firm can ethically and legally take on this entity as a client.

Focus specifically on identifying:
1. **Mergers & Acquisitions** - Any M&A activity involving the entity, target companies, or acquiring parties
2. **Partnerships & Joint Ventures** - Business partnerships, strategic alliances, or joint ventures
3. **Litigation & Lawsuits** - Active or pending lawsuits, legal disputes, class actions (as plaintiff or defendant)
4. **Regulatory Actions** - Government investigations, SEC inquiries, FTC actions, compliance issues, fines, sanctions
5. **Disputes** - Contract disputes, IP disputes, employment disputes, shareholder disputes
6. **Industry-wide Issues** - Sector-wide regulatory changes, antitrust concerns, or collective legal matters
7. **Executive Moves** - C-suite changes, key personnel departures, executive controversies
8. **Board Memberships** - Board appointments, resignations, or directors serving on multiple boards
9. **Ownership Changes** - Significant stake acquisitions, divestitures, private equity involvement, activist investors
10. **Other Conflict-Relevant News** - Bankruptcy, restructuring, reputational issues, adverse media coverage

NEWS ARTICLES:
${articles
  .map(
    (a, i) => `
Article ${i + 1}:
- Title: ${a.title}
- Source: ${a.source?.name || "Unknown"}
- Description: ${a.description || "No description"}
- Published: ${a.publishedAt}
- URL: ${a.url}
`
  )
  .join("\n")}

Provide your analysis in the following JSON format:
{
  "summary": "A brief 2-3 sentence overview highlighting the most significant conflict-of-interest concerns for a law firm considering this client",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "conflicts": [
    {
      "title": "Brief title describing the conflict type (e.g., 'Active Litigation with XYZ Corp')",
      "source": "Source article name",
      "description": "Detailed description explaining why this poses a potential conflict of interest for the firm, including relevant parties, nature of the issue, and implications",
      "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      "url": "Article URL"
    }
  ],
  "recommendations": [
    "Specific actionable recommendation for conflict clearance process",
    "Additional due diligence steps"
  ]
}

Risk Level Guidelines:
- LOW: No significant conflict indicators; standard intake procedures sufficient
- MEDIUM: Potential conflicts identified; requires enhanced conflict check against existing clients and matters
- HIGH: Significant conflict indicators; requires immediate review by conflicts counsel and potentially ethics committee
- CRITICAL: Clear conflict-of-interest red flags; likely cannot represent this client without waivers or declining representation

Analyze all articles and generate up to 10 potential conflicts of interest, prioritized by severity.
Be specific and cite actual content from the articles. Focus on facts that would trigger a conflict check, not general business news.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a senior legal conflicts analyst at a law firm. Your expertise is identifying potential conflicts of interest that could prevent or complicate client representation. Always respond with valid JSON only, no additional text.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      throw new Error(errorData.error?.message || "Failed to analyze with AI");
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No analysis content returned from AI");
    }

    // Parse the JSON response
    const analysis = JSON.parse(content) as AnalysisResult;

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Analysis error:", error);

    // If JSON parsing failed, return a structured error response
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Failed to parse AI analysis response" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to analyze results", details: String(error) },
      { status: 500 }
    );
  }
}
