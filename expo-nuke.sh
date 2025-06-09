#!/bin/bash

echo "🧨 Starting Expo Nuke & Clean Process..."

# Kill all background processes
echo "🚫 Killing Node / Metro / Watchman processes..."
killall node 2>/dev/null
killall watchman 2>/dev/null

# Disable Spotlight temporarily
echo "🛑 Disabling Spotlight indexing..."
sudo mdutil -i off /

# Fully unlock file flags
echo "🔓 Unlocking extended attributes..."
sudo xattr -rc node_modules ios android

# Use rsync trick to delete safely
echo "🧹 Using rsync to deep clean node_modules..."
mkdir empty_dir
rsync -a --delete empty_dir/ node_modules/
rm -rf node_modules

echo "🧹 Cleaning ios..."
rsync -a --delete empty_dir/ ios/
rm -rf ios

echo "🧹 Cleaning android..."
rsync -a --delete empty_dir/ android/
rm -rf android

rm -rf empty_dir

# Clean Expo files
echo "🧹 Removing .expo and package locks..."
rm -rf .expo
rm -rf package-lock.json

# Clear derived data (optional)
echo "🧹 Removing Xcode derived data..."
rm -rf ~/Library/Developer/Xcode/DerivedData

# Re-enable Spotlight indexing
echo "✅ Re-enabling Spotlight indexing..."
sudo mdutil -i on /

# Done
echo "🚀 Expo project fully nuked and cleaned. Ready for reinstall."

