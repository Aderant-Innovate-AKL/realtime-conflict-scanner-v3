import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

// Extract text from different file types
async function extractText(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Handle .docx files with mammoth
  if (fileName.endsWith(".docx")) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      console.log("Mammoth extracted text:", result.value.substring(0, 500));
      return result.value;
    } catch (error) {
      console.error("Mammoth error:", error);
      throw new Error("Failed to parse .docx file");
    }
  }

  // Handle PDF files - extract text manually from the raw content
  if (fileName.endsWith(".pdf")) {
    try {
      // Try to extract readable text from PDF binary
      const text = await file.text();
      
      // Extract text between BT and ET markers (PDF text objects)
      const textMatches: string[] = [];
      const btPattern = /BT[\s\S]*?ET/g;
      let match;
      while ((match = btPattern.exec(text)) !== null) {
        // Extract text from Tj and TJ operators
        const tjMatches = match[0].match(/\(([^)]+)\)\s*Tj/g);
        if (tjMatches) {
          tjMatches.forEach((tm) => {
            const extracted = tm.match(/\(([^)]+)\)/);
            if (extracted && extracted[1]) {
              textMatches.push(extracted[1]);
            }
          });
        }
      }

      // Also try to extract text from stream content
      const streamPattern = /stream\s*([\s\S]*?)\s*endstream/g;
      while ((match = streamPattern.exec(text)) !== null) {
        const content = match[1];
        // Look for readable text sequences
        const readable = content.match(/[A-Za-z][A-Za-z\s,.'-]{2,}/g);
        if (readable) {
          textMatches.push(...readable.filter((r) => r.length > 3));
        }
      }

      if (textMatches.length > 0) {
        const extractedText = textMatches.join(" ").replace(/\s+/g, " ").trim();
        console.log("PDF extracted text:", extractedText.substring(0, 500));
        return extractedText;
      }

      // Fallback: clean binary and look for text
      const cleaned = text
        .replace(/[^\x20-\x7E\n\r\t]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      console.log("PDF fallback text:", cleaned.substring(0, 500));
      return cleaned;
    } catch (error) {
      console.error("PDF parse error:", error);
      throw new Error(
        "Failed to parse PDF. Please try uploading a .docx or .txt file instead."
      );
    }
  }

  // Handle plain text files
  if (fileName.endsWith(".txt") || fileName.endsWith(".rtf")) {
    const text = await file.text();
    console.log("Text file content:", text.substring(0, 500));
    return text;
  }

  // For other files, try to read as text
  const text = await file.text();
  const cleaned = text
    .replace(/[^\x20-\x7E\n\r\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Extract text from the file
    const text = await extractText(file);

    console.log("File name:", file.name);
    console.log("Extracted text length:", text.length);
    console.log("Extracted text preview:", text.substring(0, 500));

    if (text.length < 20) {
      return NextResponse.json(
        {
          error:
            "Could not extract readable text from the file. Please try a .docx or .txt file.",
          keywords: [],
        },
        { status: 400 }
      );
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is not configured. Please add it to your .env.local file.",
        },
        { status: 500 }
      );
    }

    // Use OpenAI to extract key parties
    const prompt = `Analyze the following document text and extract ALL key parties that could be relevant for a conflict of interest check.

Look carefully for:
- Full names of people (e.g., "Sarah Johnson", "David Lee")
- Company names (e.g., "DL Consulting Ltd")
- Organization names
- Law firms mentioned
- Any business entities
- Opposing parties in disputes
- Clients
- Partners or associates

Document content:
"""
${text.substring(0, 15000)}
"""

Extract every person name and company/organization name you can find. Return a JSON array of strings.
If you find names, return them. If the document is empty or unreadable, return an empty array [].

Example output format:
["Sarah Johnson", "David Lee", "DL Consulting Ltd", "Green Street Properties"]`;

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
              "You are an expert at extracting names of people and organizations from legal documents. Always respond with ONLY a valid JSON array of strings, nothing else. No markdown, no explanation.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      throw new Error(errorData.error?.message || "Failed to extract keywords");
    }

    const data = await response.json();
    let content = data.choices[0]?.message?.content;

    console.log("AI response:", content);

    if (!content) {
      throw new Error("No content returned from AI");
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
    const keywords = JSON.parse(content) as string[];

    return NextResponse.json({
      keywords: keywords.filter((k) => k && k.trim().length > 0),
      fileName: file.name,
    });
  } catch (error) {
    console.error("Extract keywords error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to extract keywords", details: String(error) },
      { status: 500 }
    );
  }
}
