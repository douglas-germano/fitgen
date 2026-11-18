"""Feed photo processing: format, size, metadata and bad input."""
import io
import unittest

from PIL import Image

from app.shared import images


def make(size, mode='RGB', fmt='JPEG', color=(200, 30, 30), exif_orientation=None, gps=False):
    img = Image.new(mode, size, color)
    out = io.BytesIO()
    kwargs = {}
    if exif_orientation or gps:
        exif = Image.Exif()
        if exif_orientation:
            exif[0x0112] = exif_orientation
        if gps:
            exif[0x8825] = {1: 'S', 2: (15.0, 36.0, 0.0), 3: 'W', 4: (56.0, 5.0, 0.0)}
            exif[0x010F] = 'FakeCam'
        kwargs['exif'] = exif
    img.save(out, fmt, **kwargs)
    return out.getvalue()


def result(data):
    img = Image.open(io.BytesIO(data)); img.load(); return img


class FeedPhotoTests(unittest.TestCase):
    def test_landscape_becomes_4x5_at_most_1080_wide(self):
        out = result(images.feed_photo(make((4000, 3000)), '4:5'))
        self.assertEqual(out.format, 'JPEG')
        self.assertEqual(out.size, (1080, 1350))

    def test_portrait_9x16(self):
        out = result(images.feed_photo(make((3000, 4000)), '9:16'))
        self.assertEqual(out.size, (1080, 1920))

    def test_small_images_are_cropped_but_never_enlarged(self):
        out = result(images.feed_photo(make((400, 400)), '4:5'))
        self.assertEqual(out.size, (320, 400))
        self.assertLessEqual(out.width, 1080)

    def test_ratio_is_exact_for_odd_sizes(self):
        for size in [(1001, 777), (2999, 4001), (1080, 1080), (333, 1999)]:
            for ratio, (w, h) in images.RATIOS.items():
                out = result(images.feed_photo(make(size), ratio))
                self.assertLessEqual(abs(out.width * h - out.height * w), max(w, h), (size, ratio, out.size))

    def test_exif_gps_and_camera_are_stripped(self):
        src = make((1200, 1500), gps=True)
        self.assertIn(0x8825, Image.open(io.BytesIO(src)).getexif())
        out = result(images.feed_photo(src, '4:5'))
        self.assertEqual(len(out.getexif()), 0)
        self.assertNotIn('exif', out.info)

    def test_exif_rotation_is_applied_before_cropping(self):
        # Stored landscape 1500x1000 with "rotate 90°" -> really a 1000x1500 portrait.
        out = result(images.feed_photo(make((1500, 1000), exif_orientation=6), '4:5'))
        self.assertEqual(out.size, (1000, 1250))

    def test_transparent_png_is_flattened_on_white(self):
        src = make((600, 750), mode='RGBA', fmt='PNG', color=(0, 0, 0, 0))
        out = result(images.feed_photo(src, '4:5'))
        self.assertEqual(out.mode, 'RGB')
        self.assertGreater(min(out.getpixel((10, 10))), 240)

    def test_gif_uses_first_frame(self):
        frames = [Image.new('P', (300, 300), i) for i in (1, 2)]
        buf = io.BytesIO(); frames[0].save(buf, 'GIF', save_all=True, append_images=frames[1:])
        self.assertEqual(result(images.feed_photo(buf.getvalue(), '4:5')).size, (240, 300))

    def test_file_is_much_smaller_than_the_original(self):
        import os
        noisy = Image.frombytes('RGB', (3000, 3750), os.urandom(3000 * 3750 * 3))
        buf = io.BytesIO(); noisy.save(buf, 'JPEG', quality=95)
        out = images.feed_photo(buf.getvalue(), '4:5')
        self.assertLess(len(out), len(buf.getvalue()) / 4)

    def test_bad_input_is_rejected(self):
        for bad in (b'', b'not an image', b'\x89PNG\r\n\x1a\n' + b'\x00' * 20):
            with self.assertRaises(images.ImageError):
                images.feed_photo(bad, '4:5')
        with self.assertRaises(images.ImageError):
            images.feed_photo(make((100, 100)), '1:1')

    def test_pixel_bomb_is_rejected_without_decoding(self):
        big = Image.new('1', (9000, 9000))  # 81 MP, compresses to almost nothing
        buf = io.BytesIO(); big.save(buf, 'PNG')
        with self.assertRaises(images.ImageError):
            images.feed_photo(buf.getvalue(), '4:5')


if __name__ == '__main__':
    unittest.main()
