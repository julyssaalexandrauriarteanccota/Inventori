import type { NextConfig } from "next";
import withSerwist from "@serwist/next";

function buildRemotePatterns(): NonNullable<NonNullable<NextConfig['images']>['remotePatterns']> {
  const defaults = [
    'http://localhost:4000/api/v1',
    'http://127.0.0.1:4000/api/v1',
  ]

  const sources = [
    process.env.NEXT_PUBLIC_API_URL,
    ...defaults,
  ].filter((value): value is string => Boolean(value))

  const seen = new Set<string>()

  return sources.flatMap((source) => {
    try {
      const url = new URL(source)
      const key = `${url.protocol}//${url.hostname}:${url.port || 'default'}`
      if (seen.has(key)) {
        return []
      }
      seen.add(key)

      return [{
        protocol: url.protocol === 'https:' ? 'https' : 'http',
        hostname: url.hostname,
        port: url.port,
        pathname: '/**',
      }]
    } catch {
      return []
    }
  })
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ['172.28.64.1'],
  // NOTE: turbopack.root removed — apuntaba al monorepo root (../../) lo que
  // hacía que Turbopack observara demasiados archivos en Windows y rompía HMR.
  // @erp/shared se resuelve via node_modules symlink de pnpm workspaces.
  turbopack: {},
  images: {
    remotePatterns: buildRemotePatterns(),
  },
};

export default withSerwist({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
})(nextConfig);
