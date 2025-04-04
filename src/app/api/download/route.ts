import { NextRequest, NextResponse } from "next/server";

/**
 * Stream-based file download proxy
 * This endpoint fetches files from our proxy endpoint which then fetches from Discord
 */
export async function GET(request: NextRequest) {
  // Get the URL to download from query parameters
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "Missing URL parameter" },
      { status: 400 }
    );
  }

  // Validate that it's a Discord URL for security
  const isDiscordUrl =
    url.startsWith("https://cdn.discordapp.com/") ||
    url.startsWith("https://media.discordapp.net/");

  if (!isDiscordUrl) {
    return NextResponse.json(
      { error: "Only Discord URLs are supported" },
      { status: 400 }
    );
  }

  console.log(`Download endpoint fetching from Discord URL: ${url}`);

  try {
    // Create the URL to our proxy endpoint
    const origin = request.nextUrl.origin;
    const proxyUrl = `${origin}/api/proxy?url=${encodeURIComponent(url)}`;

    console.log(`Fetching through proxy: ${proxyUrl}`);

    // Fetch the file through our proxy
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      console.error(
        `Error fetching from proxy: ${response.status} ${response.statusText}`
      );
      return NextResponse.json(
        { error: `Failed to fetch through proxy: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get necessary headers from the response
    const contentType =
      response.headers.get("Content-Type") || "application/octet-stream";
    const contentLength = response.headers.get("Content-Length");

    // Get the content as array buffer (binary data)
    const buffer = await response.arrayBuffer();

    // Create a new response with the content
    const newResponse = new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": contentLength || String(buffer.byteLength),
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
      },
    });

    console.log(
      `Successfully downloaded and forwarding ${url}, size: ${buffer.byteLength} bytes`
    );
    return newResponse;
  } catch (error) {
    console.error("Download proxy error:", error);
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    );
  }
}
