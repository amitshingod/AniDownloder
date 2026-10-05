FROM node:20-bullseye-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg curl python3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN mkdir -p bin && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o bin/yt-dlp && \
    chmod a+rx bin/yt-dlp
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npx", "tsx", "server.ts"]
