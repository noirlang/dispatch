import os
from PIL import Image, ImageDraw

res_base = "/home/ra/Projects/dispatch/android/android/app/src/main/res"
src_logo_path = "/home/ra/Projects/dispatch/android/assets/dispatch.png"

src_img = Image.open(src_logo_path).convert("RGBA")

sizes = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

def create_app_icon(size, is_round=False):
    # Scale 4x for super sampling
    scale = 4
    canvas_size = size * scale
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    # 1. Fill background with deep black #0a0a0a
    bg_color = (10, 10, 10, 255)
    if is_round:
        draw.ellipse([0, 0, canvas_size - 1, canvas_size - 1], fill=bg_color)
    else:
        radius = int(canvas_size * 0.22)
        draw.rounded_rectangle([0, 0, canvas_size - 1, canvas_size - 1], radius=radius, fill=bg_color)

    # 2. Resize the original dispatch.png logo to fit inside (65% of size)
    logo_size = int(canvas_size * 0.65)
    logo_resized = src_img.resize((logo_size, logo_size), Image.Resampling.LANCZOS)

    # Paste logo centered
    offset_x = (canvas_size - logo_size) // 2
    offset_y = (canvas_size - logo_size) // 2
    canvas.paste(logo_resized, (offset_x, offset_y), logo_resized)

    # 3. Add subtle outer border
    if is_round:
        draw.ellipse([0, 0, canvas_size - 1, canvas_size - 1], outline=(35, 35, 35, 255), width=int(scale * 1.2))
    else:
        radius = int(canvas_size * 0.22)
        draw.rounded_rectangle([0, 0, canvas_size - 1, canvas_size - 1], radius=radius, outline=(35, 35, 35, 255), width=int(scale * 1.2))

    # Downsample
    return canvas.resize((size, size), Image.Resampling.LANCZOS)

for folder, size in sizes.items():
    folder_path = os.path.join(res_base, folder)
    os.makedirs(folder_path, exist_ok=True)

    # Standard / squircle
    icon = create_app_icon(size, is_round=False)
    icon.save(os.path.join(folder_path, "ic_launcher.png"), "PNG")

    # Round
    icon_round = create_app_icon(size, is_round=True)
    icon_round.save(os.path.join(folder_path, "ic_launcher_round.png"), "PNG")
    print(f"Generated {folder}: {size}x{size}")

# Also generate a foreground image for adaptive icon (432x432 for xxxhdpi)
adaptive_fg_size = 432
adaptive_fg = Image.new("RGBA", (adaptive_fg_size, adaptive_fg_size), (0, 0, 0, 0))
logo_fit = int(adaptive_fg_size * 0.55)
logo_fg_resized = src_img.resize((logo_fit, logo_fit), Image.Resampling.LANCZOS)
off_x = (adaptive_fg_size - logo_fit) // 2
off_y = (adaptive_fg_size - logo_fit) // 2
adaptive_fg.paste(logo_fg_resized, (off_x, off_y), logo_fg_resized)
adaptive_fg.save(os.path.join(res_base, "drawable", "ic_launcher_foreground.png"), "PNG")
print("Saved ic_launcher_foreground.png")

print("All icons successfully generated from dispatch.png!")
