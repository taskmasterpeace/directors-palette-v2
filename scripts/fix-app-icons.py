#!/usr/bin/env python3
"""
Fix App Icons - Remove Transparency
Removes alpha channel from all iOS app icons and adds white background
"""

import os
from PIL import Image

ICON_DIR = "/Users/taskmasterpeace/Documents/git/directorspal/directors-palette-v2/ios/App/App/Assets.xcassets/AppIcon.appiconset"

def remove_transparency(image_path):
    """Remove transparency from PNG and add white background"""
    try:
        # Open the image
        img = Image.open(image_path)

        # Convert RGBA to RGB if it has transparency
        if img.mode in ('RGBA', 'LA', 'PA'):
            # Create a white background
            background = Image.new('RGB', img.size, (255, 255, 255))

            # Paste the image on the white background
            if img.mode == 'RGBA':
                background.paste(img, mask=img.split()[3])  # Use alpha channel as mask
            else:
                background.paste(img)

            # Save as RGB (no alpha channel)
            background.save(image_path, 'PNG', quality=100)
            return True
        elif img.mode != 'RGB':
            # Convert other modes to RGB
            rgb_img = img.convert('RGB')
            rgb_img.save(image_path, 'PNG', quality=100)
            return True

        return False  # Already RGB, no changes needed
    except Exception as e:
        print(f"  ❌ Error processing {os.path.basename(image_path)}: {e}")
        return False

def main():
    print("🔧 Fixing app icons - removing transparency...\n")

    if not os.path.exists(ICON_DIR):
        print(f"❌ Icon directory not found: {ICON_DIR}")
        return

    # Process all PNG files
    fixed_count = 0
    skipped_count = 0

    for filename in os.listdir(ICON_DIR):
        if filename.endswith('.png'):
            filepath = os.path.join(ICON_DIR, filename)
            print(f"  Processing: {filename}...", end=" ")

            if remove_transparency(filepath):
                print("✅ Fixed")
                fixed_count += 1
            else:
                print("⏭️  Skipped (already opaque)")
                skipped_count += 1

    print(f"\n✅ Done! Fixed {fixed_count} icons, skipped {skipped_count} icons")
    print("\nIcons are now opaque with white background and ready for TestFlight! 🎉")

if __name__ == "__main__":
    main()
