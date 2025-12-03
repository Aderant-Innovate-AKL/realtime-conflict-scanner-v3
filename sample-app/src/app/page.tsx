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
      setCurrentStep("searching");
      const searchTerms = [formData.names, formData.variants]
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
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "MEDIUM":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "HIGH":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "CRITICAL":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
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
        return "●";
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
    <div className="min-h-screen flex flex-col">
      {/* Main Content Area with Gradient Background */}
      <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-[#0f1628] via-[#1a1f3a] to-[#2d1f3d]">
        {/* Decorative curved shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Large curved arc - right side */}
          <svg
            className="absolute -right-[300px] top-1/2 -translate-y-1/2 w-[900px] h-[900px] opacity-10"
            viewBox="0 0 400 400"
            fill="none"
          >
            <circle
              cx="200"
              cy="200"
              r="180"
              stroke="url(#gradient1)"
              strokeWidth="40"
              fill="none"
            />
            <defs>
              <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          {/* Smaller arc - bottom right */}
          <svg
            className="absolute -right-[100px] -bottom-[200px] w-[600px] h-[600px] opacity-10"
            viewBox="0 0 400 400"
            fill="none"
          >
            <circle
              cx="200"
              cy="200"
              r="150"
              stroke="url(#gradient2)"
              strokeWidth="30"
              fill="none"
            />
            <defs>
              <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
            </defs>
          </svg>
          {/* Top glow */}
          <div className="absolute top-0 right-1/4 w-[600px] h-[400px] bg-gradient-to-b from-rose-900/20 to-transparent blur-3xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-8 py-16">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Left Side - Branding & Description */}
            <div className="text-white pt-8">
              <div className="mb-2">
                <span className="text-2xl font-light tracking-wide text-white/90">
                  Aderant
                </span>
              </div>
              <h1 className="text-5xl font-light tracking-[0.3em] text-white mb-8">
                STRIDYN
              </h1>
              <h2 className="text-2xl font-semibold text-white mb-6">
                Real-time Conflict Scanner
              </h2>
              <p className="text-white/70 text-lg leading-relaxed max-w-lg">
                When running your business becomes a distraction, no one wins. 
                The world&apos;s best firms rely on our solutions to identify potential 
                conflicts and keep their businesses moving forward.
              </p>
            </div>

            {/* Right Side - Form Card */}
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md ml-auto">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                Conflict Search
              </h3>
              <p className="text-gray-500 mb-6">
                Enter information to scan for potential conflicts
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Names
                  </label>
                  <input
                    type="text"
                    value={formData.names}
                    onChange={(e) =>
                      setFormData({ ...formData, names: e.target.value })
                    }
                    placeholder="e.g., John Smith, Jane Doe"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Variants
                  </label>
                  <input
                    type="text"
                    value={formData.variants}
                    onChange={(e) =>
                      setFormData({ ...formData, variants: e.target.value })
                    }
                    placeholder="e.g., Smith Industries, Smith & Co"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Articles
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.pageSize}
                      onChange={(e) =>
                        setFormData({ ...formData, pageSize: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Time Range
                    </label>
                    <select
                      value={formData.timeRange}
                      onChange={(e) =>
                        setFormData({ ...formData, timeRange: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="1">1 month</option>
                      <option value="2">2 months</option>
                      <option value="3">3 months</option>
                      <option value="6">6 months</option>
                      <option value="12">12 months</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-6 rounded-full bg-[#1e88e5] hover:bg-[#1976d2] text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                        ? "Searching..."
                        : "Analyzing..."}
                    </>
                  ) : (
                    "Scan for Conflicts"
                  )}
                </button>

                {error && (
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {error}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section - White Background */}
      {(analysis || newsResults.length > 0) && (
        <div className="bg-gray-50 py-12 px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-8 items-stretch">
              {/* Risk Assessment */}
              {analysis && (
                <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-900">
                      Risk Assessment
                    </h3>
                    <span
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${getRiskColor(analysis.riskLevel)}`}
                    >
                      {getRiskIcon(analysis.riskLevel)} {analysis.riskLevel}
                    </span>
                  </div>

                  <p className="text-gray-600 leading-relaxed mb-6">
                    {analysis.summary}
                  </p>

                  {sortedConflicts.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Identified Conflicts
                      </h4>
                      <div className="space-y-3">
                        {sortedConflicts.map((conflict, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-lg bg-gray-50 border border-gray-200"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900 mb-1">
                                  {conflict.title}
                                </h5>
                                <p className="text-sm text-gray-600">
                                  {conflict.description}
                                </p>
                                <p className="text-xs text-gray-400 mt-2">
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
                                className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-700"
                              >
                                View source →
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.recommendations &&
                    analysis.recommendations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                          Recommendations
                        </h4>
                        <ul className="space-y-2">
                          {analysis.recommendations.map((rec, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-gray-600 text-sm"
                            >
                              <span className="text-blue-500 mt-0.5">→</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              )}

              {/* News Sources */}
              {newsResults.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 flex flex-col">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">
                    News Sources ({newsResults.length})
                  </h3>

                  <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                    {newsResults.map((article, idx) => (
                      <a
                        key={idx}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-4 rounded-lg bg-gray-50 border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all group"
                      >
                        <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                          {article.title}
                        </h4>
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                          {article.description}
                        </p>
                        <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                          <span>{article.source?.name || "Unknown"}</span>
                          <span>
                            {new Date(article.publishedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#0a1628] py-6 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Logo Circle */}
            <div className="w-10 h-10 rounded-full border-2 border-blue-500 flex items-center justify-center">
              <span className="text-blue-500 font-semibold text-sm">A</span>
            </div>
            <span className="text-white/80 tracking-[0.2em] text-sm font-light">
              S T R I D Y N
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/60">
            <span>Copyright © 2025 Aderant - All rights reserved</span>
            <a href="#" className="hover:text-white transition-colors">
              Aderant Home
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Support
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
