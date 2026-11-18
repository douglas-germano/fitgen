"""Storage routing (R2 vs local) with a fake S3 client; no network, no credentials."""
import os
os.environ.setdefault('SECRET_KEY', 'isolated-test-secret-key')
os.environ.setdefault('JWT_SECRET_KEY', 'isolated-test-jwt-secret-key-32-chars')
os.environ.setdefault('DATABASE_URL', 'sqlite://')
import tempfile
import unittest
from unittest.mock import patch

from flask import Flask

from app.shared import storage

R2_ENV = {'R2_ACCOUNT_ID': 'acct', 'R2_ACCESS_KEY_ID': 'k', 'R2_SECRET_ACCESS_KEY': 's', 'R2_BUCKET': 'fitgen-media'}


class FakeBody:
    def __init__(self, data): self.data = data
    def read(self, n=None): return self.data[:n]


class FakeS3:
    def __init__(self): self.objects, self.calls = {}, []
    def put_object(self, Bucket, Key, Body, ContentType, CacheControl):
        self.objects[Key] = Body; self.calls.append(('put', Bucket, Key, ContentType, CacheControl))
    def get_object(self, Bucket, Key):
        if Key not in self.objects: raise KeyError(Key)
        return {'Body': FakeBody(self.objects[Key])}
    def delete_object(self, Bucket, Key): self.objects.pop(Key, None)
    def generate_presigned_url(self, op, Params, ExpiresIn): return f"https://r2.test/{Params['Bucket']}/{Params['Key']}?exp={ExpiresIn}"


class StorageTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__); self.tmp = tempfile.mkdtemp(); self.app.instance_path = self.tmp
        self.app.root_path = self.tmp
        self.ctx = self.app.app_context(); self.ctx.push()
        self.s3 = FakeS3()

    def tearDown(self): self.ctx.pop()

    def r2(self):
        return patch.dict(os.environ, R2_ENV), patch.object(storage, '_s3', lambda: self.s3)

    def test_not_configured_without_credentials(self):
        with patch.dict(os.environ, {k: '' for k in R2_ENV}):
            self.assertFalse(storage.configured())
            value = storage.save('posts', 'a.png', b'png', 'png')
            self.assertEqual(value, 'uploads/community/a.png')
            self.assertEqual(storage.read('posts', value), b'png')
            self.assertEqual(storage.image_payload('posts', value)['data_uri'], 'data:image/png;base64,cG5n')
            storage.remove('posts', value)
            self.assertIsNone(storage.read('posts', value))

    def test_uploads_go_to_r2_with_private_cache_headers(self):
        env, client = self.r2()
        with env, client:
            self.assertTrue(storage.configured())
            value = storage.save('avatars', 'user_1_x.jpg', b'jpg', 'jpg')
            self.assertEqual(value, 'r2:avatars/user_1_x.jpg')
            self.assertEqual(self.s3.calls[0], ('put', 'fitgen-media', 'avatars/user_1_x.jpg', 'image/jpeg', 'private, max-age=31536000, immutable'))
            self.assertEqual(storage.read('avatars', value), b'jpg')
            self.assertEqual(storage.image_payload('posts', value), {'url': 'https://r2.test/fitgen-media/avatars/user_1_x.jpg?exp=3600', 'expires_in': 3600})
            self.assertTrue(storage.display_value(value).startswith('https://r2.test/'))
            storage.remove('avatars', value)
            self.assertEqual(self.s3.objects, {})

    def test_legacy_and_external_values_keep_working_when_r2_is_on(self):
        env, client = self.r2()
        with env, client:
            self.assertEqual(storage.display_value('uploads/profile_pics/old.jpg'), 'uploads/profile_pics/old.jpg')
            self.assertEqual(storage.display_value('https://lh3.googleusercontent.com/a'), 'https://lh3.googleusercontent.com/a')
            self.assertIsNone(storage.display_value(None))
            self.assertIsNone(storage.read('avatars', 'https://example.com/a.jpg'))
            storage.remove('avatars', 'https://example.com/a.jpg')  # never touches external URLs

    def test_upload_failure_is_reported_not_swallowed(self):
        class Broken(FakeS3):
            def put_object(self, **kw): raise RuntimeError('boom')
        with patch.dict(os.environ, R2_ENV), patch.object(storage, '_s3', lambda: Broken()):
            with self.assertRaises(storage.StorageError):
                storage.save('posts', 'a.png', b'x', 'png')

    def test_missing_r2_object_returns_none(self):
        env, client = self.r2()
        with env, client:
            self.assertIsNone(storage.read('posts', 'r2:posts/nope.png'))

    def test_ttl_is_configurable_and_bounded(self):
        with patch.dict(os.environ, {'R2_URL_TTL': '900'}): self.assertEqual(storage.url_ttl(), 900)
        with patch.dict(os.environ, {'R2_URL_TTL': 'abc'}): self.assertEqual(storage.url_ttl(), 3600)
        with patch.dict(os.environ, {'R2_URL_TTL': '5'}): self.assertEqual(storage.url_ttl(), 60)


if __name__ == '__main__':
    unittest.main()
