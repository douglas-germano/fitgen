"""Profile photo upload: format from bytes, unique names, old file cleanup. Isolated temp dir, mocked DB."""
import os
os.environ.setdefault('SECRET_KEY', 'isolated-test-secret-key')
os.environ.setdefault('JWT_SECRET_KEY', 'isolated-test-jwt-secret-key-32-chars')
os.environ.setdefault('DATABASE_URL', 'sqlite://')
import io
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4
from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token
from app.modules.identity.interface.routes import profile as routes

JPEG = b'\xff\xd8\xff\xe0' + b'\0' * 32
PNG = b'\x89PNG\r\n\x1a\n' + b'\0' * 32


class ProfileImageTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.app = Flask(__name__, root_path=self.tmp.name)
        self.app.config['JWT_SECRET_KEY'] = 'isolated-test-jwt-secret-key-32-chars'
        JWTManager(self.app)
        self.app.register_blueprint(routes.profile_bp, url_prefix='/profile')
        self.client = self.app.test_client()
        self.user = SimpleNamespace(id=str(uuid4()), profile_picture=None)
        with self.app.app_context():
            self.headers = {'Authorization': 'Bearer ' + create_access_token(identity=self.user.id)}
        patches = [patch.object(routes, 'User'), patch.object(routes, 'db')]
        user_model, _ = [p.start() for p in patches]
        user_model.query.get.return_value = self.user
        for p in patches:
            self.addCleanup(p.stop)
        self.addCleanup(self.tmp.cleanup)

    def upload(self, data, name):
        return self.client.post('/profile/image', headers=self.headers, content_type='multipart/form-data',
                                data={'file': (io.BytesIO(data), name)})

    def stored(self):
        folder = os.path.join(self.tmp.name, 'static', routes.PROFILE_PICS_DIR)
        return sorted(os.listdir(folder)) if os.path.isdir(folder) else []

    def test_accepts_jpeg_named_like_an_iphone_heic(self):
        res = self.upload(JPEG, 'IMG_0001.HEIC')
        self.assertEqual(res.status_code, 200, res.get_json())
        self.assertTrue(self.user.profile_picture.endswith('.jpg'))

    def test_accepts_file_without_extension(self):
        self.assertEqual(self.upload(PNG, 'photo').status_code, 200)
        self.assertTrue(self.user.profile_picture.endswith('.png'))

    def test_rejects_non_images_regardless_of_name(self):
        res = self.upload(b'not an image', 'profile.jpg')
        self.assertEqual(res.status_code, 400)
        self.assertIsNone(self.user.profile_picture)
        self.assertEqual(self.stored(), [])

    def test_each_upload_gets_a_new_url_and_replaces_the_old_file(self):
        self.upload(JPEG, 'profile.jpg')
        first = self.user.profile_picture
        self.upload(JPEG, 'profile.jpg')
        self.assertNotEqual(self.user.profile_picture, first)
        self.assertEqual(self.stored(), [os.path.basename(self.user.profile_picture)])

    def test_keeps_external_photo_urls_untouched(self):
        self.user.profile_picture = 'https://example.com/me.jpg'
        with patch('os.remove') as remove:
            self.assertEqual(self.upload(JPEG, 'a.jpg').status_code, 200)
        remove.assert_not_called()


if __name__ == '__main__':
    unittest.main()
