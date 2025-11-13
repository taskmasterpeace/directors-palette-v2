#!/bin/bash

# Fix App Icons - Remove Transparency and Add White Background
# This script removes alpha channel from all app icons and adds white background

ICON_DIR="/Users/taskmasterpeace/Documents/git/directorspal/directors-palette-v2/ios/App/App/Assets.xcassets/AppIcon.appiconset"

echo "🔧 Fixing app icons - removing transparency..."

# Process each PNG file in the icon set
for icon in "$ICON_DIR"/*.png; do
    if [ -f "$icon" ]; then
        filename=$(basename "$icon")
        echo "  Processing: $filename"

        # Use ImageMagick to:
        # 1. Flatten the image (removes alpha)
        # 2. Add white background
        # 3. Save as PNG with no alpha channel
        magick "$icon" -background white -alpha remove -alpha off "$icon"

        # Alternative using sips (built-in macOS tool)
        # sips -s format png "$icon" --out "$icon"
    fi
done

echo "✅ All app icons fixed!"
echo ""
echo "Icons are now opaque with white background and ready for TestFlight"
