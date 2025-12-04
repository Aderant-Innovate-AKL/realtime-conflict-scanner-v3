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
    const prompt = `You are a conflict of interest and risk assessment analyst. Analyze the following news articles about "${searchTerms}" and identify potential conflicts of interest, legal issues, regulatory concerns, or reputational risks.

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
  "summary": "A brief 2-3 sentence overview of the overall risk assessment",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "conflicts": [
    {
      "title": "Brief title of the conflict",
      "source": "Source article name",
      "description": "Detailed description of the potential conflict",
      "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      "url": "Article URL if relevant"
    }
  ],
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2"
  ]
}

Risk Level Guidelines:
- LOW: Minor concerns, routine monitoring recommended
- MEDIUM: Notable concerns requiring attention, enhanced due diligence recommended
- HIGH: Significant red flags, immediate review and action required
- CRITICAL: Severe issues, potential legal/regulatory exposure, immediate escalation required

Generate a list of the top 10 potential conflicts of interest available in the articles.
Be specific and cite actual content from the articles. Only include genuine concerns, not speculation.`;

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
              "You are a professional risk and compliance analyst. Always respond with valid JSON only, no additional text.",
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
    let content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No analysis content returned from AI");
    }

    // Clean up the response - remove markdown code blocks if present
    content = content.trim();
    if (content.startsWith("```json")) {
      content = content.slice(7);
    } else if (content.startsWith("```")) {
      content = content.slice(3);
    }
    if (content.endsWith("```")) {
      content = content.slice(0, -3);
    }
    content = content.trim();

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
