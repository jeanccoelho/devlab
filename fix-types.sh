#!/bin/bash
echo "Limpando caches do TypeScript e Node..."
rm -rf node_modules/.cache
rm -rf .tsbuildinfo
rm -rf build
rm -rf .remix

echo "Reinstalando dependências..."
pnpm install --force

echo "Executando typecheck..."
pnpm tsc
