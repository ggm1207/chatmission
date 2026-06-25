# 채팅 구조대 백엔드 (AWS App Runner용).
# 의존성이 전혀 없어 빌드 단계 없이 node: 빌트인만으로 실행한다.
FROM node:22-slim

WORKDIR /app

# 키가 담긴 .env.local 등은 절대 복사하지 않는다. 실행에 필요한 것만 명시 복사.
COPY server.mjs ./server.mjs
COPY lib ./lib
COPY public ./public

ENV PORT=8080 HOST=0.0.0.0 NODE_ENV=production
EXPOSE 8080

CMD ["node", "server.mjs"]
