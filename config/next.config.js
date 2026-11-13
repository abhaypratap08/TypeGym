/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  // Next 15: `devIndicators: false` is the supported way to remove the overlay;
  // the old `buildActivity` key no longer hides the indicator.
  devIndicators: false,
}

module.exports = nextConfig
