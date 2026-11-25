from app.shared import storage
from app.shared.extensions import db
from app.modules.analytics.domain.progress_photo import ProgressPhoto

KIND = 'progress-photos'


def delete_all_for_user(user_id):
    """Remove every stored object and row of a user's progress photos (LGPD erasure). Does not commit."""
    for photo in ProgressPhoto.query.filter_by(user_id=user_id).all():
        storage.remove(KIND, photo.storage_key)
        db.session.delete(photo)
