import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type RemotePattern = { protocol: string; hostname: string; port?: string; pathname: string };

function buildRemotePatterns(): RemotePattern[] {
  const patterns: RemotePattern[] = [];
  const visited = new Set<string>();

  const addFromUrl = (urlString: string) => {
    try {
      const url = new URL(urlString);
      const key = `${url.protocol}//${url.hostname}:${url.port || ""}`;
      if (visited.has(key)) return;
      visited.add(key);
      patterns.push({
        protocol: url.protocol.replace(":", ""),
        hostname: url.hostname,
        port: url.port || undefined,
        pathname: "/**",
      });
    } catch (error) {
      console.warn("Failed to register remote pattern for", urlString, error);
    }
  };

  addFromUrl(API_URL);
  const baseHost = (() => {
    try {
      return new URL(API_URL).hostname;
    } catch {
      return "";
    }
  })();

  if (baseHost === "localhost") {
    addFromUrl(API_URL.replace("localhost", "127.0.0.1"));
  } else if (baseHost === "127.0.0.1") {
    addFromUrl(API_URL.replace("127.0.0.1", "localhost"));
  }

  if (patterns.length === 0) {
    addFromUrl("http://localhost:8000");
    addFromUrl("http://127.0.0.1:8000");
  }

  return patterns;
}

const shouldUnoptimize = ["1", "true"].includes((process.env.NEXT_IMAGE_UNOPTIMIZED ?? "").toLowerCase());

const nextConfig: NextConfig = {
  images: {
    remotePatterns: buildRemotePatterns(),
    ...(shouldUnoptimize ? { unoptimized: true } : {}),
  },
  async rewrites() {
    const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
    return [
      {
        source: "/api/:path*",
        destination: `${base}/api/:path*`,
      },
      {
        source: "/media/:path*",
        destination: `${base}/media/:path*`,
      },
    ];
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;

