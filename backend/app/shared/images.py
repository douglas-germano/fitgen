"""Feed photo processing, Instagram style.

Every feed photo is re-encoded by the server, whatever the app sent:
  - EXIF orientation applied, then ALL metadata dropped (GPS location, camera, dates)
  - centre-cropped to the chosen format (4:5 or 9:16)
  - scaled down to at most 1080 px wide (never enlarged)
  - saved as progressive JPEG, quality 80 (transparency flattened onto white)
"""
import io

from PIL import Image, ImageOps, UnidentifiedImageError

MAX_WIDTH = 1080
JPEG_QUALITY = 80
# Reject images that would need huge amounts of memory to decode (decompression bombs).
MAX_PIXELS = 64_000_000
RATIOS = {'4:5': (4, 5), '9:16': (9, 16)}


class ImageError(ValueError):
    pass


def _crop_box(width, height, ratio):
    """Largest centred box with the target aspect ratio (left, top, right, bottom)."""
    rw, rh = RATIOS[ratio]
    if width * rh > height * rw:  # too wide: trim the sides
        new_w = round(height * rw / rh)
        left = (width - new_w) // 2
        return left, 0, left + new_w, height
    new_h = round(width * rh / rw)  # too tall: trim top and bottom
    top = (height - new_h) // 2
    return 0, top, width, top + new_h


def feed_photo(data, ratio):
    """Return JPEG bytes for a feed photo in `ratio` ('4:5' or '9:16')."""
    if ratio not in RATIOS:
        raise ImageError('Formato de foto inválido.')
    try:
        image = Image.open(io.BytesIO(data))
        if image.width * image.height > MAX_PIXELS:
            raise ImageError('A foto tem resolução alta demais.')
        image.load()  # first frame only for GIFs
    except ImageError:
        raise
    except (UnidentifiedImageError, OSError, SyntaxError, Image.DecompressionBombError) as exc:
        raise ImageError('Não foi possível ler a foto. Tente outra imagem.') from exc

    image = ImageOps.exif_transpose(image)
    if image.mode in ('RGBA', 'LA') or (image.mode == 'P' and 'transparency' in image.info):
        rgba = image.convert('RGBA')
        flat = Image.new('RGB', rgba.size, (255, 255, 255))
        flat.paste(rgba, mask=rgba.getchannel('A'))
        image = flat
    else:
        image = image.convert('RGB')

    image = image.crop(_crop_box(image.width, image.height, ratio))
    if image.width > MAX_WIDTH:
        rw, rh = RATIOS[ratio]
        image = image.resize((MAX_WIDTH, round(MAX_WIDTH * rh / rw)), Image.LANCZOS)

    out = io.BytesIO()
    # No exif/icc passed: the output carries no metadata.
    image.save(out, 'JPEG', quality=JPEG_QUALITY, optimize=True, progressive=True)
    return out.getvalue()
