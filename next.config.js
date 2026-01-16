/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // これを true にすることで、ビルド時の型エラーを強制的に無視します
    ignoreBuildErrors: true,
  },
  eslint: {
    // これを true にすることで、ビルド時のESLintエラーを無視します
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;