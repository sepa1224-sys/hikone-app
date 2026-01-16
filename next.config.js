/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // これを true にすると、型エラーを無視して無理やり公開します
    ignoreBuildErrors: true,
  },
  eslint: {
    // これを true にすると、細かい書き方のミスも無視します
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;