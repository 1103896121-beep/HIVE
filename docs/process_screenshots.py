import os
from PIL import Image

def process_screenshots():
    dir_path = r'e:\workrooten\Hive\docs\screenshots'
    output_dir = r'e:\workrooten\Hive\docs\final_screenshots'
    os.makedirs(output_dir, exist_ok=True)
    
    specs = {
        '67': (1290, 2796),
        '65': (1284, 2778),
        '55': (1242, 2208)
    }
    
    views = ['welcome', 'hive', 'bonds', 'profile', 'map']
    files = [f for f in os.listdir(dir_path) if f.endswith('.png')]
    
    for v in views:
        for sz_key, target_size in specs.items():
            # Find best match for this view and size
            candidates = [f for f in files if v in f.lower() and sz_key in f]
            if not candidates:
                print(f"Warning: No candidates for {v} {sz_key}")
                continue
                
            # Prefer 'full' versions
            best = sorted(candidates, key=lambda x: ('full' in x.lower()), reverse=True)[0]
            
            try:
                img = Image.open(os.path.join(dir_path, best))
                # Ensure RGB
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                target_w, target_h = target_size
                aspect = target_h / target_w
                curr_aspect = img.height / img.width
                
                if curr_aspect > aspect:
                    new_h = img.height
                    new_w = int(new_h / aspect)
                else:
                    new_w = img.width
                    new_h = int(new_w * aspect)
                
                # Create canvas with background color (dark grey consistent with app)
                canvas = Image.new('RGB', (new_w, new_h), (10, 10, 10))
                # Paste centered
                canvas.paste(img, ((new_w - img.width) // 2, (new_h - img.height) // 2))
                
                # Resize to target
                final_img = canvas.resize(target_size, Image.Resampling.LANCZOS)
                output_path = os.path.join(output_dir, f'{v}_{sz_key}.png')
                final_img.save(output_path)
                print(f"Processed {v}_{sz_key}: {best} -> {target_size}")
            except Exception as e:
                print(f"Error processing {best}: {e}")

if __name__ == "__main__":
    process_screenshots()
