import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Get the file from the request
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    console.log("Proxying file to n8n:", file.name, "Size:", file.size);

    // Create new FormData for n8n
    const n8nFormData = new FormData();
    n8nFormData.append("data", file);

    // Forward to n8n webhook (production URL)
    const n8nResponse = await fetch(
      "https://simonshen2025.app.n8n.cloud/webhook/extract-terms",
      {
        method: "POST",
        body: n8nFormData,
      }
    );

    console.log("n8n response status:", n8nResponse.status);

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error("n8n error:", errorText);
      return NextResponse.json(
        { error: `n8n extraction failed: ${errorText}` },
        { status: n8nResponse.status }
      );
    }

    const data = await n8nResponse.json();
    console.log("n8n response data:", data);

    // Parse n8n response format
    let terms: string[] = [];
    
    // Handle if n8n returns an array wrapper
    const responseData = Array.isArray(data) ? data[0] : data;
    
    // Check if response already has the expected format
    if (responseData.success && Array.isArray(responseData.terms)) {
      // n8n already formatted the response correctly
      terms = responseData.terms;
    } 
    // Otherwise, try to parse the old format: { output: { person_names: "...", company_names: "..." } }
    else if (responseData.output) {
      const output = responseData.output;
      
      // Extract person names
      if (output.person_names) {
        const personNames = output.person_names
          .split(',')
          .map((name: string) => name.trim())
          .filter((name: string) => name.length > 0);
        terms.push(...personNames);
      }
      
      // Extract company names
      if (output.company_names) {
        const companyNames = output.company_names
          .split(',')
          .map((name: string) => name.trim())
          .filter((name: string) => name.length > 0);
        terms.push(...companyNames);
      }
    } else {
      return NextResponse.json(
        { error: "Invalid response format from n8n workflow" },
        { status: 500 }
      );
    }

    // Return in a format compatible with the frontend
    return NextResponse.json({
      success: true,
      count: terms.length,
      terms: terms,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to extract parties",
      },
      { status: 500 }
    );
  }
}

