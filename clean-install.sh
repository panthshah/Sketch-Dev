#!/bin/bash

echo "=== Sketch Plugin Clean Install Script ==="
echo "This will remove all traces of the plugin and reinstall it fresh"
echo ""

# 1. Kill Sketch if running
echo "1. Stopping Sketch if running..."
pkill -x Sketch 2>/dev/null || echo "Sketch was not running"

# 2. Remove all plugin instances
echo "2. Removing all plugin instances..."
rm -rf ~/Library/Application\ Support/com.bohemiancoding.sketch3/Plugins/*spec* 2>/dev/null
rm -rf ~/Library/Application\ Support/com.bohemiancoding.sketch3/Plugins/sketch-spec-generator* 2>/dev/null

# 3. Clear all Sketch caches
echo "3. Clearing Sketch caches..."
rm -rf ~/Library/Caches/com.bohemiancoding.sketch3* 2>/dev/null
rm -rf ~/Library/Saved\ Application\ State/com.bohemiancoding.sketch3* 2>/dev/null
rm -rf ~/Library/Preferences/com.bohemiancoding.sketch3.plist 2>/dev/null

# 4. Clear plugin caches
echo "4. Clearing plugin caches..."
rm -rf ~/Library/Application\ Support/com.bohemiancoding.sketch3/PluginCache* 2>/dev/null
rm -rf ~/Library/Application\ Support/com.bohemiancoding.sketch3/.plugin* 2>/dev/null

# 5. Build fresh plugin
echo "5. Building fresh plugin..."
cd /workspace
rm -rf sketch-spec-generator.sketchplugin
npm run build

# 6. Install the plugin
echo "6. Installing plugin..."
cp -R sketch-spec-generator.sketchplugin ~/Library/Application\ Support/com.bohemiancoding.sketch3/Plugins/

echo ""
echo "=== Clean install complete! ==="
echo "Now please:"
echo "1. Start Sketch"
echo "2. Go to Plugins → sketch-spec-generator → Generate Specs"
echo "3. Check version in Sketch → Preferences → Plugins (should be 0.2.0)"