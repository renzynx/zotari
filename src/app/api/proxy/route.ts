import { NextRequest, NextResponse } from "next/server";

interface RefreshedResponse {
  refreshed_urls?: [{ original?: string; refreshed?: string }];
}

interface CachedURL {
  href: string;
  expires: Date;
}

// In-memory cache (Note: This will be reset on serverless function cold starts)
const cache = new Map<string, CachedURL>();

function parseValidURL(str: string): URL | false {
  try {
    return new URL(str);
  } catch (_) {
    return false;
  }
}

function handleCORS(request: NextRequest): NextResponse | null {
  const methods = "GET, OPTIONS";

  // Handle preflight requests
  if (
    request.headers.get("Origin") !== null &&
    request.headers.get("Access-Control-Request-Method") &&
    request.headers.get("Access-Control-Request-Headers") !== null
  ) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
        "Access-Control-Allow-Methods": methods,
        "Access-Control-Allow-Headers":
          request.headers.get("Access-Control-Request-Headers") || "*",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  return null;
}

function withCORS(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get("Origin");
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }
  return response;
}

function redirectResponse(
  request: NextRequest,
  href: string,
  expires: Date,
  custom: "original" | "refreshed" | "memory" | "bucket"
): NextResponse {
  const response = NextResponse.redirect(href, { status: 302 });
  response.headers.set("Expires", expires.toUTCString());
  response.headers.set("x-discord-cdn-proxy", custom);

  return withCORS(request, response);
}

// Handle OPTIONS requests
export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new NextResponse(null, { status: 204 });
}

// Handle GET requests
export async function GET(request: NextRequest) {
  try {
    // Check if Discord token is configured
    if (!process.env.DISCORD_TOKEN) {
      return withCORS(
        request,
        NextResponse.json(
          { error: "DISCORD_TOKEN is not configured" },
          { status: 400 }
        )
      );
    }

    // Parse the URL parameter
    const { searchParams } = new URL(request.url);
    const urlParam = searchParams.get("url");

    if (!urlParam) {
      return withCORS(
        request,
        NextResponse.json(
          {
            error:
              "Provide Discord CDN url as the url query parameter. Example: /api/proxy?url=https://cdn.discordapp.com/attachments/channel/message/filename.ext",
          },
          { status: 400 }
        )
      );
    }

    const attachmentURL = parseValidURL(decodeURIComponent(urlParam));

    if (!attachmentURL) {
      return withCORS(
        request,
        NextResponse.json({ error: "Invalid URL provided" }, { status: 400 })
      );
    }

    const channel = attachmentURL.pathname.split("/")[2];

    // If CHANNELS are defined, ensure that provided channel is allowed
    if (process.env.CHANNELS && !process.env.CHANNELS.includes(channel)) {
      return withCORS(
        request,
        NextResponse.json(
          { error: "Provided channel is not allowed." },
          { status: 403 }
        )
      );
    }

    const params = new URLSearchParams(attachmentURL.search);

    // Check if URL is already valid and not expired
    if (params.get("ex") && params.get("is") && params.get("hm")) {
      const expr = new Date(parseInt(params.get("ex") || "", 16) * 1000);
      if (expr.getTime() > Date.now()) {
        return redirectResponse(request, attachmentURL.href, expr, "original");
      }
    }

    const fileName = attachmentURL.pathname.split("/").pop() || "";

    // Check in-memory cache first
    const cacheKey = `${channel}-${fileName}`;
    const cachedURL = cache.get(cacheKey);

    if (cachedURL && cachedURL.expires.getTime() > Date.now()) {
      return redirectResponse(
        request,
        cachedURL.href,
        cachedURL.expires,
        "memory"
      );
    }

    // For database caching with App Router
    if (process.env.DISCORD_CDN_PROXY_USE_DB === "true") {
      // This is a placeholder for database access
      // In a real application, you would use something like Prisma, MongoDB, etc.
      // For example with prisma:
      // const cachedEntry = await prisma.cdnCache.findUnique({
      //   where: { id: cacheKey },
      // });
      // if (cachedEntry && new Date(cachedEntry.expires).getTime() > Date.now()) {
      //   const cachedURLFromDB = {
      //     href: cachedEntry.href,
      //     expires: new Date(cachedEntry.expires)
      //   };
      //   cache.set(cacheKey, cachedURLFromDB);
      //   return redirectResponse(request, cachedURLFromDB.href, cachedURLFromDB.expires, "bucket");
      // }
    }

    // If not in cache, request refreshed URL from Discord API
    const response = await fetch(
      "https://discord.com/api/v9/attachments/refresh-urls",
      {
        method: "POST",
        headers: {
          Authorization: `${process.env.DISCORD_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ attachment_urls: [attachmentURL.href] }),
      }
    );

    // If failed, return original Discord API response
    if (response.status !== 200) {
      const errorData = await response.json();

      console.log(errorData);

      return withCORS(
        request,
        NextResponse.json(errorData, { status: response.status })
      );
    }

    const json: RefreshedResponse = await response.json();

    console.log(json);

    if (
      Array.isArray(json?.refreshed_urls) &&
      json?.refreshed_urls[0]?.refreshed
    ) {
      const refreshedURL = new URL(json.refreshed_urls[0].refreshed);
      const params = new URLSearchParams(refreshedURL.search);
      const expires = new Date(parseInt(params.get("ex") || "", 16) * 1000);

      const cachedURL: CachedURL = { href: refreshedURL.href, expires };

      // Save to memory cache
      cache.set(cacheKey, cachedURL);

      // Save to database if configured
      if (process.env.DISCORD_CDN_PROXY_USE_DB === "true") {
        // Placeholder for database save operation
        // For example with prisma:
        // await prisma.cdnCache.upsert({
        //   where: { id: cacheKey },
        //   create: {
        //     id: cacheKey,
        //     href: cachedURL.href,
        //     expires: cachedURL.expires
        //   },
        //   update: {
        //     href: cachedURL.href,
        //     expires: cachedURL.expires
        //   }
        // });
      }

      return redirectResponse(request, refreshedURL.href, expires, "refreshed");
    }

    return withCORS(request, NextResponse.json(json, { status: 400 }));
  } catch (e: any) {
    console.error(`Exception: ${e}`);
    return withCORS(
      request,
      NextResponse.json({ error: e.message }, { status: 500 })
    );
  }
}
