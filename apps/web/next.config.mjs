/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@leadguardian/core", "@leadguardian/db"],
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
