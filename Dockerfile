FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.14.0

# Copy lockfiles and workspace manifests for better install caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json .npmrc* ./
COPY apps/web/package.json apps/web/package.json
COPY packages/wrapped/package.json packages/wrapped/package.json
COPY packages/utils/package.json packages/utils/package.json
COPY packages/i18n/package.json packages/i18n/package.json
COPY config/package.json config/package.json
COPY tooling/typescript/package.json tooling/typescript/package.json
COPY tooling/tailwind/package.json tooling/tailwind/package.json
COPY tooling/scripts/package.json tooling/scripts/package.json
COPY apps/web/tsconfig.json apps/web/tsconfig.json
COPY packages/wrapped/tsconfig.json packages/wrapped/tsconfig.json
COPY packages/utils/tsconfig.json packages/utils/tsconfig.json
COPY packages/i18n/tsconfig.json packages/i18n/tsconfig.json
COPY config/tsconfig.json config/tsconfig.json

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the monorepo
COPY . .

# Build only the web app
RUN pnpm turbo run build --filter @repo/web

# Hugging Face Spaces expects the app on port 7860
EXPOSE 7860

# Run Next on the expected host/port from the web app directory.
CMD ["sh", "-c", "cd apps/web && PORT=${PORT:-7860} HOSTNAME=0.0.0.0 pnpm start --hostname 0.0.0.0 --port ${PORT:-7860}"]
