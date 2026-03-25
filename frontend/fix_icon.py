from PIL import Image
import sys

app_icon_path = 'e:/workrooten/Hive/frontend/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'
try:
    img = Image.open(app_icon_path)
    if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
        # Create a white background and composite
        img = img.convert('RGBA')
        background = Image.new('RGBA', img.size, (255, 255, 255))
        alpha_composite = Image.alpha_composite(background, img)
        final_img = alpha_composite.convert('RGB')
    else:
        final_img = img.convert('RGB')

    final_img = final_img.resize((1024, 1024), Image.Resampling.LANCZOS)
    final_img.save(app_icon_path, format='PNG')
    print("AppIcon processed successfully without alpha channel and resized to 1024x1024.")
except Exception as e:
    print(f"Error processing AppIcon: {e}")
    sys.exit(1)
