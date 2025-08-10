set -e

echo "📦 Installing dependencies for all apps..."
pnpm install

echo "🚀 Starting Next.js apps (Turbopack)..."
pnpm dev
  
echo "🛠️  Starting Storybook..."
pnpm storybook