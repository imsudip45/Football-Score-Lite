/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Enable static export for Electron production build
  output: 'export',
  // Disable trailing slashes for cleaner file paths
  trailingSlash: false,
  // Use relative paths for assets in Electron production build
  assetPrefix: './',
  // Empty turbopack config to silence Next.js 16 warning
  turbopack: {},
}

export default nextConfig
