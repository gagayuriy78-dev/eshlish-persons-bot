# ISHLISH PERSONS Mini App on Cloud Run: the Express API (artifacts/api-server)
# also serves the built React app (artifacts/persons-lc-challenge) from STATIC_DIR.
# The Telegram bot (main.py) is NOT in this image; it runs on its own VM.
FROM node:24-slim
WORKDIR /w
RUN corepack enable && corepack prepare pnpm@10.34.6 --activate

COPY . .
RUN pnpm install --frozen-lockfile \
      --filter "@workspace/api-server..." \
      --filter "@workspace/persons-lc-challenge..." \
      --filter "@workspace/db..."

# The Vite config requires PORT/BASE_PATH even for a build.
RUN cd artifacts/persons-lc-challenge && PORT=8080 BASE_PATH=/ NODE_ENV=production pnpm run build
RUN cd artifacts/api-server && pnpm run build

ENV NODE_ENV=production \
    STATIC_DIR=/w/artifacts/persons-lc-challenge/dist/public

# Create/upgrade the tables (additive changes only), then start the server.
CMD ["sh", "-c", "cd /w/lib/db && pnpm exec drizzle-kit push --config ./drizzle.config.ts && cd /w/artifacts/api-server && exec node --enable-source-maps ./dist/index.mjs"]
