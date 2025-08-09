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
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  // Ensure proper environment variable handling
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Add build output configuration
  output: 'standalone',
}

export default nextConfig
