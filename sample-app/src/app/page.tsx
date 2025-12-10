"use client";

import { useState, useRef } from "react";

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
  const [searchMode, setSearchMode] = useState<"terms" | "document">("terms");
  const [formData, setFormData] = useState({
    names: "",
    pageSize: "20",
    timeRange: "1",
  });
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [newsResults, setNewsResults] = useState<NewsArticle[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<
    "idle" | "searching" | "analyzing" | "complete"
  >("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate PDF Report
  const generatePDFReport = async () => {
    if (!analysis) return;

    // Dynamically import jsPDF to avoid SSR issues
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let yPos = 20;

    // Helper function to add text with word wrap
    const addWrappedText = (
      text: string,
      x: number,
      y: number,
      maxWidth: number,
      lineHeight: number
    ) => {
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return y + lines.length * lineHeight;
    };

    // Helper function to check page break
    const checkPageBreak = (requiredSpace: number) => {
      if (yPos + requiredSpace > 280) {
        doc.addPage();
        yPos = 20;
      }
    };

    // Title
    doc.setFillColor(15, 22, 40);
    doc.rect(0, 0, pageWidth, 45, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("Conflict Risk Analysis Report", margin, 28);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 38);

    yPos = 60;
    doc.setTextColor(0, 0, 0);

    // Section 1: Client Basic Information
    doc.setFillColor(30, 136, 229);
    doc.rect(margin, yPos - 5, contentWidth, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("1. Client Basic Information", margin + 5, yPos + 2);
    yPos += 15;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    
    // Show search mode and terms
    doc.text(`Search Mode: ${searchMode === "terms" ? "Manual Terms" : "Document Upload"}`, margin, yPos);
    yPos += 8;
    
    // Show search terms based on mode
    const searchTermsText = searchMode === "terms" 
      ? formData.names 
      : keywords.join(", ");
    doc.text("Search Terms:", margin, yPos);
    yPos += 6;
    yPos = addWrappedText(searchTermsText || "N/A", margin + 5, yPos, contentWidth - 10, 5);
    yPos += 5;
    
    doc.text(`Time Range: ${formData.timeRange} month(s)`, margin, yPos);
    yPos += 8;
    doc.text(`Articles Searched: ${formData.pageSize}`, margin, yPos);
    yPos += 8;

    if (uploadedFileName) {
      doc.text(`Uploaded Document: ${uploadedFileName}`, margin, yPos);
      yPos += 8;
    }

    yPos += 10;
    checkPageBreak(50);

    // Section 2: AI Risk Assessment
    doc.setFillColor(30, 136, 229);
    doc.rect(margin, yPos - 5, contentWidth, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("2. AI Risk Assessment", margin + 5, yPos + 2);
    yPos += 15;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);

    // Risk Level Badge
    const riskColors: Record<string, [number, number, number]> = {
      LOW: [34, 197, 94],
      MEDIUM: [251, 191, 36],
      HIGH: [249, 115, 22],
      CRITICAL: [239, 68, 68],
    };
    const riskColor = riskColors[analysis.riskLevel] || [156, 163, 175];
    doc.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
    doc.roundedRect(margin, yPos - 3, 50, 10, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(`${analysis.riskLevel} RISK`, margin + 5, yPos + 4);
    yPos += 15;

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text("Summary:", margin, yPos);
    yPos += 6;
    yPos = addWrappedText(analysis.summary, margin, yPos, contentWidth, 5);
    yPos += 15;

    checkPageBreak(60);

    // Section 3: Identified Conflicts
    doc.setFillColor(30, 136, 229);
    doc.rect(margin, yPos - 5, contentWidth, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("3. Identified Conflicts & Related Parties", margin + 5, yPos + 2);
    yPos += 15;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);

    if (analysis.conflicts && analysis.conflicts.length > 0) {
      const sortedConflicts = [...analysis.conflicts].sort(
        (a, b) => getRiskPriority(a.severity) - getRiskPriority(b.severity)
      );

      sortedConflicts.forEach((conflict, idx) => {
        checkPageBreak(40);

        doc.setFont("helvetica", "bold");
        doc.text(`${idx + 1}. ${conflict.title}`, margin, yPos);
        yPos += 6;

        // Severity badge
        const sevColor = riskColors[conflict.severity] || [156, 163, 175];
        doc.setFillColor(sevColor[0], sevColor[1], sevColor[2]);
        doc.roundedRect(margin, yPos - 3, 30, 8, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.text(conflict.severity, margin + 3, yPos + 2);
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        yPos += 10;

        doc.setFont("helvetica", "normal");
        yPos = addWrappedText(conflict.description, margin, yPos, contentWidth, 5);
        yPos += 3;

        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Source: ${conflict.source}`, margin, yPos);
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        yPos += 12;
      });
    } else {
      doc.text("No significant conflicts identified.", margin, yPos);
      yPos += 10;
    }

    yPos += 5;
    checkPageBreak(60);

    // Section 4: Recent News Summary
    doc.setFillColor(30, 136, 229);
    doc.rect(margin, yPos - 5, contentWidth, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("4. Recent News Summary", margin + 5, yPos + 2);
    yPos += 15;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);

    if (newsResults.length > 0) {
      doc.text(`Found ${newsResults.length} relevant news articles:`, margin, yPos);
      yPos += 10;

      // Show top 10 news
      const topNews = newsResults.slice(0, 10);
      topNews.forEach((article, idx) => {
        checkPageBreak(25);

        doc.setFont("helvetica", "bold");
        const titleLines = doc.splitTextToSize(
          `${idx + 1}. ${article.title}`,
          contentWidth
        );
        doc.text(titleLines, margin, yPos);
        yPos += titleLines.length * 5 + 2;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `${article.source?.name || "Unknown"} - ${new Date(article.publishedAt).toLocaleDateString()}`,
          margin,
          yPos
        );
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        yPos += 8;
      });

      if (newsResults.length > 10) {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`... and ${newsResults.length - 10} more articles`, margin, yPos);
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        yPos += 10;
      }
    } else {
      doc.text("No relevant news articles found.", margin, yPos);
      yPos += 10;
    }

    yPos += 5;
    checkPageBreak(60);

    // Section 5: Recommendations
    doc.setFillColor(30, 136, 229);
    doc.rect(margin, yPos - 5, contentWidth, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("5. Recommended Actions", margin + 5, yPos + 2);
    yPos += 15;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    if (analysis.recommendations && analysis.recommendations.length > 0) {
      analysis.recommendations.forEach((rec, idx) => {
        checkPageBreak(15);
        const bullet = `${idx + 1}.`;
        doc.text(bullet, margin, yPos);
        yPos = addWrappedText(rec, margin + 10, yPos, contentWidth - 10, 5);
        yPos += 5;
      });
    } else {
      doc.text("No specific recommendations at this time.", margin, yPos);
      yPos += 10;
    }

    // Footer on last page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFillColor(15, 22, 40);
      doc.rect(0, 285, pageWidth, 15, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text(
        `Aderant - Conflict Risk Analysis | Page ${i} of ${pageCount}`,
        margin,
        292
      );
      doc.text(
        "Confidential - For Internal Use Only",
        pageWidth - margin - 50,
        292
      );
    }

    // Save the PDF
    const fileName = `conflict-report-${formData.names.replace(/[^a-zA-Z0-9]/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setError(null);
    setUploadedFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/extract-parties", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to extract parties");
      }

      const data = await response.json();
      setKeywords((prev) => {
        const newKeywords = data.terms.filter(
          (k: string) => !prev.includes(k)
        );
        return [...prev, ...newKeywords];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file");
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const addKeyword = () => {
    const trimmed = newKeyword.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setNewKeyword("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation based on mode
    if (searchMode === "terms" && !formData.names.trim()) {
      setError("Please enter search terms");
      return;
    }
    if (searchMode === "document" && keywords.length === 0) {
      setError("Please upload a document to extract parties first");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setNewsResults([]);
    setAnalysis(null);

    try {
      setCurrentStep("searching");
      
      // Determine search terms based on mode
      let searchTerms: string;
      let namesParam: string;
      let variantsParam: string;
      
      if (searchMode === "terms") {
        searchTerms = formData.names;
        namesParam = formData.names;
        variantsParam = "";
      } else {
        searchTerms = keywords.join(", ");
        namesParam = keywords[0] || "";
        variantsParam = keywords.slice(1).join(", ");
      }

      const newsResponse = await fetch("/api/search-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          names: namesParam,
          variants: variantsParam,
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
              <h1 className="text-4xl font-light tracking-[0.2em] text-white mb-6">
                Conflict Scanner
              </h1>
              <h2 className="text-2xl font-semibold text-white mb-6">
                Real-time Conflict Scanner
              </h2>
              <p className="text-white/70 text-lg leading-relaxed max-w-lg">
                Enter search information to scan news sources and identify
                potential conflicts of interest with AI-powered risk assessment.
              </p>
            </div>

            {/* Right Side - Form Card */}
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md ml-auto">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                Conflict Search
              </h3>
              <p className="text-gray-500 mb-6">
                Choose a search method to scan for potential conflicts
              </p>

              {/* Mode Tabs */}
              <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setSearchMode("terms")}
                  className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                    searchMode === "terms"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search Terms
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSearchMode("document")}
                  className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                    searchMode === "document"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Upload Document
                  </span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Terms Mode */}
                {searchMode === "terms" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Search Terms
                    </label>
                    <input
                      type="text"
                      value={formData.names}
                      onChange={(e) =>
                        setFormData({ ...formData, names: e.target.value })
                      }
                      placeholder="e.g., Apple, Microsoft, Google"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                    <p className="text-xs text-gray-400 mt-1.5">
                      Enter company names, person names, or keywords to search
                    </p>
                  </div>
                )}

                {/* Document Mode */}
                {searchMode === "document" && (
                  <>
                    {/* File Upload Section */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Upload Document
                      </label>
                      <div
                        className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-all ${
                          isExtracting
                            ? "border-blue-400 bg-blue-50"
                            : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".txt,.pdf,.doc,.docx,.rtf"
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          disabled={isExtracting}
                        />
                        {isExtracting ? (
                          <div className="flex items-center justify-center gap-2 text-blue-600">
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
                            <span className="text-sm">Extracting parties...</span>
                          </div>
                        ) : (
                          <div className="text-gray-500">
                            <svg
                              className="w-8 h-8 mx-auto mb-2 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                              />
                            </svg>
                            <p className="text-sm">Drop a file or click to upload</p>
                            <p className="text-xs text-gray-400 mt-1">
                              AI will extract key parties for conflict search
                            </p>
                          </div>
                        )}
                      </div>
                      {uploadedFileName && (
                        <p className="text-xs text-gray-500 mt-1">
                          Uploaded: {uploadedFileName}
                        </p>
                      )}
                    </div>

                    {/* Extracted Parties Section */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Extracted Parties ({keywords.length})
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={newKeyword}
                          onChange={(e) => setNewKeyword(e.target.value)}
                          onKeyPress={(e) =>
                            e.key === "Enter" && (e.preventDefault(), addKeyword())
                          }
                          placeholder="Add party manually..."
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={addKeyword}
                          className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors"
                        >
                          Add
                        </button>
                      </div>
                      {keywords.length > 0 ? (
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                          {keywords.map((keyword, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium"
                            >
                              {keyword}
                              <button
                                type="button"
                                onClick={() => removeKeyword(keyword)}
                                className="w-4 h-4 rounded-full hover:bg-blue-200 flex items-center justify-center"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">
                          Upload a document to extract parties, or add them manually
                        </p>
                      )}
                    </div>
                  </>
                )}

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
            {/* Generate Report Button */}
            {analysis && (
              <div className="mb-8 flex justify-end">
                <button
                  onClick={generatePDFReport}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#0f1628] hover:bg-[#1a2744] text-white font-medium transition-all shadow-lg"
                >
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
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Download PDF Report
                </button>
              </div>
            )}

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
                          <span suppressHydrationWarning>
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
            <div className="w-10 h-10 rounded-full border-2 border-blue-500 flex items-center justify-center">
              <span className="text-blue-500 font-semibold text-sm">A</span>
            </div>
            <span className="text-white/80 tracking-[0.2em] text-sm font-light">
              Conflict Scanner
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
