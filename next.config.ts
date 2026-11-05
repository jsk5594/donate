import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 가상 데이터 단계에서는 요청 시 렌더링(단순 모델)을 사용합니다.
  // DB 연결 후 캐시 전략이 정해지면 cacheComponents 도입을 검토하세요.
  cacheComponents: false,
  // 개발 서버를 Cloudflare 임시 터널(https://xxxx.trycloudflare.com)로 외부에 보여줄 때 필요
  allowedDevOrigins: ["*.trycloudflare.com"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
