from app.shared.extensions import db
from app.modules.training.data.exercise_catalog import EXERCISES, validate
from app.modules.training.domain.exercise_library import ExerciseLibrary

FIELDS = ('category', 'difficulty_level', 'muscle_groups', 'equipment_needed',
          'description', 'instructions', 'tips', 'common_mistakes')


def seed_exercise_library(overwrite=False):
    """Load the official catalog into exercise_library, matching rows by name.

    Missing exercises are created. Existing ones only get their empty fields filled,
    so edits made in the admin panel survive redeploys; `overwrite` resets them to the
    catalog. Returns (created, updated).
    """
    validate()
    existing = {row.name: row for row in ExerciseLibrary.query.all()}
    created = updated = 0
    for data in EXERCISES:
        row = existing.get(data['name'])
        if row is None:
            db.session.add(ExerciseLibrary(name=data['name'], is_active=True,
                                           **{key: data[key] for key in FIELDS}))
            created += 1
            continue
        changed = False
        for key in FIELDS:
            if (overwrite or not getattr(row, key)) and getattr(row, key) != data[key]:
                setattr(row, key, data[key])
                changed = True
        updated += changed
    db.session.commit()
    return created, updated
