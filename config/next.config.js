/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  // Next 15: `devIndicators: false` is the supported way to remove the overlay;
  // the old `buildActivity` key no longer hides the indicator.
  devIndicators: false,
  // Allow the Cloudflare quick tunnel to reach the dev server without the
  // "Cross origin request detected" warning.
  allowedDevOrigins: ['*.trycloudflare.com'],
}

module.exports = nextConfig
