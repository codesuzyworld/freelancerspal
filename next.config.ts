import type { NextConfig } from "next";
import unpluginIcons from 'unplugin-icons/webpack'

const nextConfig: NextConfig = {
  webpack(config) {
    config.plugins.push(
      unpluginIcons({
        compiler: 'jsx',
        jsx: 'react',
      }),
    )
    return config
  },
};

export default nextConfig;

