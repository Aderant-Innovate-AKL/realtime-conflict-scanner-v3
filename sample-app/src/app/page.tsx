"use client";

import { useState } from "react";

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

interface NewsArticle {
  title: string;
  description: string;
  source: { name: string };
  url: string;
  publishedAt: string;
}

export default function ConflictScanner() {
  const [formData, setFormData] = useState({
    names: "",
    variants: "",
    pageSize: "20",
    timeRange: "1",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [newsResults, setNewsResults] = useState<NewsArticle[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<
    "idle" | "searching" | "analyzing" | "complete"
  >("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setNewsResults([]);
    setAnalysis(null);

    try {
      // Step 1: Search news
      setCurrentStep("searching");
      const searchTerms = [
        formData.names,
        formData.variants,
      ]
        .filter(Boolean)
        .join(", ");

      const newsResponse = await fetch("/api/search-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          names: formData.names,
          variants: formData.variants,
          pageSize: parseInt(formData.pageSize),
          timeRange: parseInt(formData.timeRange),
        }),
      });

      if (!newsResponse.ok) {
        throw new Error("Failed to fetch news results");
      }

      const newsData = await newsResponse.json();
      setNewsResults(newsData.articles || []);

      // Step 2: Analyze with AI
      setCurrentStep("analyzing");
      const analyzeResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchTerms,
          articles: newsData.articles,
        }),
      });

      if (!analyzeResponse.ok) {
        throw new Error("Failed to analyze results");
      }

      const analysisData = await analyzeResponse.json();
      setAnalysis(analysisData);
      setCurrentStep("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setCurrentStep("idle");
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "LOW":
        return "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
      case "MEDIUM":
        return "text-amber-400 bg-amber-400/10 border-amber-400/30";
      case "HIGH":
        return "text-orange-500 bg-orange-500/10 border-orange-500/30";
      case "CRITICAL":
        return "text-red-500 bg-red-500/10 border-red-500/30";
      default:
        return "text-zinc-400 bg-zinc-400/10 border-zinc-400/30";
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case "LOW":
        return "✓";
      case "MEDIUM":
        return "⚠";
      case "HIGH":
        return "⚡";
      case "CRITICAL":
        return "🔴";
      default:
        return "○";
    }
  };

  const getRiskPriority = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return 0;
      case "HIGH":
        return 1;
      case "MEDIUM":
        return 2;
      case "LOW":
        return 3;
      default:
        return 4;
    }
  };

  const sortedConflicts = analysis?.conflicts
    ? [...analysis.conflicts].sort(
        (a, b) => getRiskPriority(a.severity) - getRiskPriority(b.severity)
      )
    : [];

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-zinc-100">
      {/* Gradient background effect */}
      <div className="fixed inset-0 bg-gradient-to-br from-violet-950/20 via-transparent to-cyan-950/20 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-violet-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            Real-time Conflict Scanner
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Conflict Risk Analysis
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Enter search information to scan news sources and identify potential
            conflicts of interest with AI-powered risk assessment.
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="space-y-6">
            <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800 p-8">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </span>
                Search Information
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Names
                  </label>
                  <input
                    type="text"
                    value={formData.names}
                    onChange={(e) =>
                      setFormData({ ...formData, names: e.target.value })
                    }
                    placeholder="e.g., John Smith, Jane Doe"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                    required
                  />
                  <p className="mt-2 text-xs text-zinc-500">
                    Primary names to search (comma-separated)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Variants
                  </label>
                  <input
                    type="text"
                    value={formData.variants}
                    onChange={(e) =>
                      setFormData({ ...formData, variants: e.target.value })
                    }
                    placeholder="e.g., Smith Industries, Smith & Co"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                  />
                  <p className="mt-2 text-xs text-zinc-500">
                    Company names or spelling variations (optional)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Number of Articles
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.pageSize}
                      onChange={(e) =>
                        setFormData({ ...formData, pageSize: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                    />
                    <p className="mt-2 text-xs text-zinc-500">
                      Max 100 articles
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Time Range
                    </label>
                    <select
                      value={formData.timeRange}
                      onChange={(e) =>
                        setFormData({ ...formData, timeRange: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                    >
                      <option value="1">Last 1 month</option>
                      <option value="2">Last 2 months</option>
                      <option value="3">Last 3 months</option>
                      <option value="6">Last 6 months</option>
                      <option value="12">Last 12 months</option>
                      <option value="24">Last 24 months</option>
                    </select>
                    <p className="mt-2 text-xs text-zinc-500">
                      News from selected period
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-violet-500/25"
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="w-5 h-5 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      {currentStep === "searching"
                        ? "Searching News..."
                        : "Analyzing with AI..."}
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      Scan for Conflicts
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Status Steps */}
            {isLoading && (
              <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800 p-6">
                <div className="space-y-4">
                  <div
                    className={`flex items-center gap-3 ${currentStep === "searching" ? "text-violet-400" : "text-zinc-500"}`}
                  >
                    {currentStep === "searching" ? (
                      <svg
                        className="w-5 h-5 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    ) : currentStep === "analyzing" ||
                      currentStep === "complete" ? (
                      <svg
                        className="w-5 h-5 text-emerald-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-current" />
                    )}
                    <span>Searching news sources...</span>
                  </div>
                  <div
                    className={`flex items-center gap-3 ${currentStep === "analyzing" ? "text-violet-400" : currentStep === "complete" ? "text-emerald-400" : "text-zinc-500"}`}
                  >
                    {currentStep === "analyzing" ? (
                      <svg
                        className="w-5 h-5 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    ) : currentStep === "complete" ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-current" />
                    )}
                    <span>Analyzing with AI...</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-red-400">
                <div className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {/* Risk Assessment Card */}
            {analysis && (
              <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800 p-8 animate-fade-in">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                    </span>
                    Risk Assessment
                  </h2>
                  <span
                    className={`px-4 py-2 rounded-full border text-sm font-bold ${getRiskColor(analysis.riskLevel)}`}
                  >
                    {getRiskIcon(analysis.riskLevel)} {analysis.riskLevel} RISK
                  </span>
                </div>

                <p className="text-zinc-300 leading-relaxed mb-6">
                  {analysis.summary}
                </p>

                {/* Conflicts */}
                {sortedConflicts.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                      Identified Conflicts
                    </h3>
                    <div className="space-y-3">
                      {sortedConflicts.map((conflict, idx) => (
                        <div
                          key={idx}
                          className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-medium text-zinc-200 mb-1">
                                {conflict.title}
                              </h4>
                              <p className="text-sm text-zinc-400">
                                {conflict.description}
                              </p>
                              <p className="text-xs text-zinc-500 mt-2">
                                Source: {conflict.source}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(conflict.severity)}`}
                            >
                              {conflict.severity}
                            </span>
        </div>
                          {conflict.url && (
          <a
                              href={conflict.url}
            target="_blank"
            rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-3 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                            >
                              View source
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {analysis.recommendations &&
                  analysis.recommendations.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                        Recommendations
                      </h3>
                      <ul className="space-y-2">
                        {analysis.recommendations.map((rec, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-3 text-zinc-300 text-sm"
                          >
                            <span className="text-violet-400 mt-0.5">→</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            )}

            {/* News Results */}
            {newsResults.length > 0 && (
              <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800 p-8">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                      />
                    </svg>
                  </span>
                  News Sources ({newsResults.length})
                </h2>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {newsResults.map((article, idx) => (
                    <a
                      key={idx}
                      href={article.url}
            target="_blank"
            rel="noopener noreferrer"
                      className="block bg-zinc-800/30 rounded-xl p-4 border border-zinc-700/50 hover:border-zinc-600 transition-colors group"
                    >
                      <h4 className="font-medium text-zinc-200 group-hover:text-violet-300 transition-colors line-clamp-2">
                        {article.title}
                      </h4>
                      <p className="text-sm text-zinc-500 mt-2 line-clamp-2">
                        {article.description}
                      </p>
                      <div className="flex items-center justify-between mt-3 text-xs text-zinc-500">
                        <span>{article.source?.name || "Unknown source"}</span>
                        <span>
                          {new Date(article.publishedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!analysis && !isLoading && newsResults.length === 0 && (
              <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800 p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-zinc-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-zinc-400 mb-2">
                  No Results Yet
                </h3>
                <p className="text-zinc-500 text-sm">
                  Enter Search information and click scan to begin analysis.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
