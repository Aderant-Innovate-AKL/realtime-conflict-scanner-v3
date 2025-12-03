import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { names, variants } = body;

    // Combine all search terms
    const searchTerms = [names, variants]
      .filter(Boolean)
      .join(" OR ");

    if (!searchTerms) {
      return NextResponse.json(
        { error: "Please provide at least one search term" },
        { status: 400 }
      );
    }

    const NEWS_API_KEY = process.env.NEWS_API_KEY;

    if (!NEWS_API_KEY) {
      return NextResponse.json(
        { error: "NEWS_API_KEY is not configured. Please add it to your .env.local file." },
        { status: 500 }
      );
    }

    // Search NewsAPI
    const url = new URL("https://newsapi.org/v2/everything");
    url.searchParams.append("q", searchTerms);
    url.searchParams.append("sortBy", "relevancy");
    url.searchParams.append("pageSize", "20");
    url.searchParams.append("language", "en");
    console.log("NewsAPI URL:", url.toString());
    const response = await fetch(url.toString(), {
      headers: {
        "X-Api-Key": NEWS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("NewsAPI error:", errorData);
      throw new Error(errorData.message || "Failed to fetch news");
    }

    const data = await response.json();

    return NextResponse.json({
      articles: data.articles || [],
      totalResults: data.totalResults || 0,
    });
  } catch (error) {
    console.error("Search news error:", error);
    return NextResponse.json(
      { error: "Failed to search news", details: String(error) },
      { status: 500 }
    );
  }
}
