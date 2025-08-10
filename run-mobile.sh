set -e

echo "📦 Installing dependencies for mobile app..."
pnpm install

echo "🚀 Starting Expo mobile app..."
pnpm --filter ./apps/mobile start
