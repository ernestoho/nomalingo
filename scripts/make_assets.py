#!/usr/bin/env python3
"""
Turn generated PNGs into shipped app assets, and render the brand icon.

The icon is drawn here rather than hand-exported so the monogram geometry has a
single source of truth: capital O in white on deep ocean blue, with a light-teal
map pin as the acute accent. The pin is deliberately smaller and tighter than in
the wordmark -- a cap-height O needs less accent mass than a lowercase o, or the
accent reads like a balloon sitting on top of the letter.
"""

import os
from PIL import Image, ImageDraw, ImageFont

SRC = "/agent/stored_files"
OUT_IMG = "assets/img"
OUT = "assets"

INK = (20, 48, 79)          # #14304F deep ocean blue
TEAL_LIGHT = (227, 243, 240)  # #E3F3F0
WHITE = (255, 255, 255)

FONT = ("node_modules/@expo-google-fonts/bricolage-grotesque/"
        "700Bold/BricolageGrotesque_700Bold.ttf")

PHOTOS = {
    "hero-puntacana": ("cmsff96dm017407adxnnfdzfv_0a9b4c73-1566-40ee-8959-8aeb20676e6c.png", (1080, 1920)),
    "venue-coworking": ("cmsff98k601az07adnqs7nh4t_aaf69ff7-4451-4882-8b1f-d34164ffa0a9.png", (900, 600)),
    "venue-cafe": ("cmsff9zek01cc07adc4iglp2m_ce7bfef0-bac7-4d65-ab59-b51644cc32fe.png", (900, 600)),
    "venue-bar": ("cmsffa12z019407adhlfiegic_8da665c1-056d-4c9a-aef4-7e94fb5f6341.png", (900, 600)),
    "venue-beach": ("cmsffalen01aq07ad7n9i5gs6_412feb35-79bd-4d82-853d-566688bcfcbb.png", (900, 600)),
    "venue-plaza": ("cmsffamwh019f07adcaenpxgh_9acfd264-7a4c-41ab-a0ba-9915ac011caf.png", (900, 600)),
}


def cover(im, size):
    """Resize preserving aspect, centre-cropped to exactly `size`."""
    tw, th = size
    sw, sh = im.size
    scale = max(tw / sw, th / sh)
    nw, nh = int(sw * scale + 0.5), int(sh * scale + 0.5)
    im = im.resize((nw, nh), Image.LANCZOS)
    left, top = (nw - tw) // 2, (nh - th) // 2
    return im.crop((left, top, left + tw, top + th))


def compress_photos():
    os.makedirs(OUT_IMG, exist_ok=True)
    for name, (fn, size) in PHOTOS.items():
        path = os.path.join(SRC, fn)
        if not os.path.exists(path):
            print(f"  MISSING {name}: {path}")
            continue
        im = Image.open(path).convert("RGB")
        im = cover(im, size)
        dest = os.path.join(OUT_IMG, f"{name}.jpg")
        im.save(dest, "JPEG", quality=80, optimize=True, progressive=True)
        kb = os.path.getsize(dest) // 1024
        print(f"  {name}.jpg  {size[0]}x{size[1]}  {kb} KB")


def draw_pin(width, fill, eye, tilt=-24):
    """
    Map pin on a transparent canvas: a circular head tapering to a point,
    with a hollow eye.

    The taper is built from the true tangent lines between the tip and the head
    circle, not from an eyeballed triangle. An eyeballed triangle leaves a
    visible notch where its corners cut inside the circle -- obvious once the
    shape is rotated, and it makes the pin look broken rather than drawn.

    `width` is the head diameter. Rendered at 4x and downsampled so the edges
    survive rotation cleanly.
    """
    SS = 4
    r = width * SS / 2.0
    # Distance from head centre down to the tip. 2.05r gives a taper that still
    # reads as a pin at icon sizes without turning into a needle.
    d_tip = r * 2.05

    pad = 2
    w_px = int(2 * r + pad * 2)
    h_px = int(r + d_tip + pad * 2)
    layer = Image.new("RGBA", (w_px, h_px), (0, 0, 0, 0))
    dr = ImageDraw.Draw(layer)

    cx, cy = pad + r, pad + r

    # Tangent touch points from the tip to the head circle.
    L = (d_tip ** 2 - r ** 2) ** 0.5
    tx = r * L / d_tip
    ty = r * r / d_tip

    dr.polygon(
        [(cx - tx, cy + ty), (cx + tx, cy + ty), (cx, cy + d_tip)],
        fill=fill,
    )
    dr.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)

    eye_r = r * 0.38
    dr.ellipse([cx - eye_r, cy - eye_r, cx + eye_r, cy + eye_r], fill=eye)

    layer = layer.rotate(tilt, resample=Image.BICUBIC, expand=True)
    w, h = layer.size
    return layer.resize((max(1, round(w / SS)), max(1, round(h / SS))), Image.LANCZOS)


def render_monogram(px, bg=INK, radius_ratio=0.235, transparent_bg=False, pad=1.0):
    """Capital O in white on deep ocean blue, pin in light teal."""
    S = px * 4
    canvas = Image.new("RGBA", (S, S), (0, 0, 0, 0))

    if not transparent_bg:
        bg_layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        ImageDraw.Draw(bg_layer).rounded_rectangle(
            [0, 0, S - 1, S - 1], radius=int(S * radius_ratio), fill=bg + (255,)
        )
        canvas = Image.alpha_composite(canvas, bg_layer)

    cap = int(S * 0.56 * pad)
    font = ImageFont.truetype(FONT, cap)
    d = ImageDraw.Draw(canvas)

    # Measure the glyph rather than trusting metrics -- Bricolage's O is not
    # where a hand-tuned offset would guess.
    bbox = d.textbbox((0, 0), "O", font=font)
    gw, gh = bbox[2] - bbox[0], bbox[3] - bbox[1]

    # Head diameter of the accent, as a fraction of the O's width. A cap-height
    # O needs far less accent mass than a lowercase o: at parity the pin reads
    # as a balloon tied to the letter instead of a diacritic.
    pin_w = gw * 0.30
    pin = draw_pin(
        pin_w,
        TEAL_LIGHT + (255,),
        (bg + (255,)) if not transparent_bg else (0, 0, 0, 0),
    )

    # Compose letter + accent as one block and centre the block, so the mark is
    # optically centred rather than the letter being centred with the accent
    # hanging off the top.
    gap = S * 0.005
    block_h = pin.size[1] + gap + gh
    block_top = (S - block_h) / 2

    pin_x = int((S - pin.size[0]) / 2)
    pin_y = int(block_top)
    canvas.alpha_composite(pin, (pin_x, max(0, pin_y)))

    ox = int((S - gw) / 2 - bbox[0])
    oy = int(block_top + pin.size[1] + gap - bbox[1])
    d.text((ox, oy), "O", font=font, fill=WHITE + (255,))

    return canvas.resize((px, px), Image.LANCZOS)


def build_icons():
    # Main app icon
    render_monogram(1024).convert("RGB").save(f"{OUT}/icon.png", "PNG")
    print("  icon.png 1024")

    # Android adaptive: foreground art must sit inside the safe circle, so the
    # monogram is inset and the background colour lives in its own layer.
    fg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    mark = render_monogram(560, transparent_bg=True)
    fg.alpha_composite(mark, ((1024 - 560) // 2, (1024 - 560) // 2))
    fg.save(f"{OUT}/android-icon-foreground.png", "PNG")

    bg = Image.new("RGB", (1024, 1024), INK)
    bg.save(f"{OUT}/android-icon-background.png", "PNG")

    mono = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    mono_mark = render_monogram(560, transparent_bg=True)
    # Monochrome layer: flatten everything to white silhouette
    r, g, b, a = mono_mark.split()
    white = Image.merge("RGBA", (
        Image.new("L", mono_mark.size, 255),
        Image.new("L", mono_mark.size, 255),
        Image.new("L", mono_mark.size, 255),
        a,
    ))
    mono.alpha_composite(white, ((1024 - 560) // 2, (1024 - 560) // 2))
    mono.save(f"{OUT}/android-icon-monochrome.png", "PNG")
    print("  android adaptive layers")

    # Splash: the mark alone on transparent; the config paints the navy behind.
    splash = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    smark = render_monogram(620, transparent_bg=True)
    splash.alpha_composite(smark, ((1024 - 620) // 2, (1024 - 620) // 2))
    splash.save(f"{OUT}/splash-icon.png", "PNG")
    print("  splash-icon.png")

    render_monogram(96).convert("RGB").save(f"{OUT}/favicon.png", "PNG")
    print("  favicon.png")


if __name__ == "__main__":
    print("photos:")
    compress_photos()
    print("icons:")
    build_icons()
    print("done")
