from sqlalchemy import inspect, text

from app.shared.extensions import db
from app.modules.training.data.exercise_catalog import EXERCISES, validate
from app.modules.training.domain.exercise_library import ExerciseLibrary
from app.modules.training.application.exercise_animations import ANIMATIONS

FIELDS = ('category', 'difficulty_level', 'muscle_groups', 'equipment_needed',
          'description', 'instructions', 'tips', 'common_mistakes')


def ensure_animation_column():
    # Production was provisioned from a schema snapshot without Alembic history.
    with db.engine.begin() as connection:
        columns = inspect(connection).get_columns('exercise_library')
        if not any(column['name'] == 'animation_key' for column in columns):
            guard = ' IF NOT EXISTS' if connection.dialect.name == 'postgresql' else ''
            connection.execute(text(
                f'ALTER TABLE exercise_library ADD COLUMN{guard} animation_key VARCHAR(255)'
            ))


def ensure_exercise_history_schema():
    with db.engine.begin() as connection:
        columns = inspect(connection).get_columns('exercise_logs')
        if any(column['name'] == 'exercise_library_id' for column in columns):
            return
        guard = ' IF NOT EXISTS' if connection.dialect.name == 'postgresql' else ''
        connection.execute(text(
            f'ALTER TABLE exercise_logs ADD COLUMN{guard} exercise_library_id UUID'
        ))
        # Match legacy entries only when the name is identical to an active catalog entry.
        connection.execute(text("""
            UPDATE exercises SET exercise_library_id = (
                SELECT id FROM exercise_library WHERE name = exercises.name AND is_active = TRUE
            )
            WHERE exercise_library_id IS NULL AND EXISTS (
                SELECT 1 FROM exercise_library WHERE name = exercises.name AND is_active = TRUE
            )
        """))
        connection.execute(text("""
            UPDATE exercise_logs SET exercise_library_id = (
                SELECT exercise_library_id FROM exercises WHERE id = exercise_logs.exercise_id
            )
            WHERE exercise_library_id IS NULL
        """))
        connection.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_exercise_logs_user_library
            ON exercise_logs (user_id, exercise_library_id)
        """))


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
        name = data['name']
        animation_key = ANIMATIONS.get(name)
        row = existing.get(name)
        if row is None:
            db.session.add(ExerciseLibrary(name=name, is_active=True, animation_key=animation_key,
                                           **{key: data[key] for key in FIELDS}))
            created += 1
            continue
        changed = bool(animation_key and animation_key != row.animation_key)
        if changed:
            row.animation_key = animation_key
        for key in FIELDS:
            if (overwrite or not getattr(row, key)) and getattr(row, key) != data[key]:
                setattr(row, key, data[key])
                changed = True
        updated += changed
    db.session.commit()
    return created, updated
