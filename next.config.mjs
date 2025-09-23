/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Add these for Vercel deployment
  serverExternalPackages: ['@prisma/client'],
  // Ensure proper environment variable handling
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    BUILD_ID: Date.now().toString(), // Force cache bust
  },
  // Force webpack to rebuild
  webpack: (config) => {
    config.cache = false;
    return config;
  },
}

export default nextConfig
