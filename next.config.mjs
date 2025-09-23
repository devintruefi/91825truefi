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
  // Force unique build ID
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
}

export default nextConfig
