/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { domains: ["localhost"] },
  eslint: {
    dirs: ["app", "components", "lib", "tests", "src"],
    ignoreDuringBuilds: true,
  },
  poweredByHeader: false,
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, canvas: false, fs: false };
    return config;
  },
};
module.exports = nextConfig;
