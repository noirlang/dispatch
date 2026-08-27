import os
from PIL import Image, ImageDraw

res_base = "/home/ra/Projects/dispatch/android/android/app/src/main/res"

# Dispatch SVG polygon points (normalized from the path viewBox 48x46)
# SVG Path: M25.946 44.938 c-.664.845 -2.021.375 -2.021-.698 V33.937 a2.26 2.26 0 0 0 -2.262-2.262 H10.287 c-.92 0 -1.456-1.04 -.92-1.788 l7.48-10.471 c1.07-1.497 0-3.578 -1.842-3.578 H1.237 c-.92 0 -1.456-1.04 -.92-1.788 L10.013.474 c.214-.297 .556-.474 .92-.474 h28.894 c.92 0 1.456 1.04 .92 1.788 l-7.48 10.471 c-1.07 1.498 0 3.579 1.842 3.579 h11.377 c.943 0 1.473 1.088 .89 1.83 L25.947 44.94 z

svg_poly_norm = [
    (10.5, 0.5),
    (39.5, 0.5),
    (32.0, 11.0),
    (43.5, 14.5),
    (24.5, 44.5),
    (24.0, 32.5),
    (8.5, 32.5),
    (16.5, 21.0),
    (0.5, 17.5),
]

sizes = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

def generate_icon(size, is_round=False):
    # Create 4x supersampled image for ultra crisp antialiasing
    scale = 4
    img_size = size * scale
    img = Image.new("RGBA", (img_size, img_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background: pure deep black #0a0a0a
    bg_color = (10, 10, 10, 255)
    if is_round:
        draw.ellipse([0, 0, img_size - 1, img_size - 1], fill=bg_color)
    else:
        # Rounded rectangle with smooth corners
        corner_radius = int(img_size * 0.22)
        draw.rounded_rectangle([0, 0, img_size - 1, img_size - 1], radius=corner_radius, fill=bg_color)

    # Draw crisp Dispatch Emblem in white
    # Target emblem size: 55% of icon size, centered
    emblem_w = img_size * 0.58
    emblem_h = img_size * 0.58
    offset_x = (img_size - emblem_w) / 2
    offset_y = (img_size - emblem_h) / 2

    # Map normalized coords (0..48, 0..46) to emblem box
    pts = [
        (offset_x + (x / 48.0) * emblem_w, offset_y + (y / 46.0) * emblem_h)
        for x, y in svg_poly_norm
    ]
    draw.polygon(pts, fill=(255, 255, 255, 255))

    # Add subtle border highlight
    if is_round:
        draw.ellipse([0, 0, img_size - 1, img_size - 1], outline=(35, 35, 35, 255), width=int(scale * 1.2))
    else:
        corner_radius = int(img_size * 0.22)
        draw.rounded_rectangle([0, 0, img_size - 1, img_size - 1], radius=corner_radius, outline=(35, 35, 35, 255), width=int(scale * 1.2))

    # Downsample with high-quality Lanczos filter
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

for folder, size in sizes.items():
    folder_path = os.path.join(res_base, folder)
    os.makedirs(folder_path, exist_ok=True)
    
    # Square/squircle icon
    icon = generate_icon(size, is_round=False)
    icon.save(os.path.join(folder_path, "ic_launcher.png"), "PNG")

    # Round icon
    icon_round = generate_icon(size, is_round=True)
    icon_round.save(os.path.join(folder_path, "ic_launcher_round.png"), "PNG")
    print(f"Generated {folder}: {size}x{size}")

print("Done generating launcher icons!")
