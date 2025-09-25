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
  },
  // Extend API route timeout for GPT-5 long-running requests
  experimental: {
    proxyTimeout: 720000, // 12 minutes
  },
  // Increase body size limit for large profile packs
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: false,
  },
}

export default nextConfig
