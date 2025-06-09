#!/bin/bash

echo "🧨 Starting Expo Nuke V3 - Super Nuclear Reset..."

# Kill all processes that may have locks
echo "🚫 Killing Node / Metro / Watchman / Expo processes..."
pkill -f "node" || true
pkill -f "expo" || true
pkill -f "watchman" || true

# Disable Spotlight indexing temporarily (saves us from FS hangs)
echo "🛑 Disabling Spotlight indexing..."
sudo mdutil -i off . >/dev/null 2>&1

# Safe move instead of risky delete (prevents SIP hangs)
if [ -d "node_modules" ]; then
  echo "📦 Moving node_modules to /tmp..."
  sudo mv node_modules /tmp/node_modules_backup_$(date +%s)
fi

if [ -d ".expo" ]; then
  echo "📦 Moving .expo to /tmp..."
  sudo mv .expo /tmp/expo_backup_$(date +%s)
fi

# Clean metro cache and watchman state
echo "🧹 Cleaning Metro and Watchman..."
rm -rf $TMPDIR/metro-*
watchman watch-del-all || true

# Clean Expo caches
echo "🧼 Cleaning Expo cache..."
rm -rf ~/.expo
rm -rf ~/.expo-cli
rm -rf .expo-shared

# Delete iOS/Android build artifacts (optional but good for full reset)
echo "🧹 Cleaning iOS/Android build dirs..."
rm -rf ios/build
rm -rf android/build

# Re-enable Spotlight
echo "🔄 Re-enabling Spotlight indexing..."
sudo mdutil -i on . >/dev/null 2>&1

echo "✅ Nuke V3 complete. Ready for clean install."
echo "🚀 Now run: npm install && npx expo prebuild --clean && npx expo run:ios"
