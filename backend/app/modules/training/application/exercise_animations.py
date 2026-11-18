import json
from pathlib import Path

from flask import url_for

ANIMATION_STORAGE_KIND = 'exercise-animations'
ANIMATIONS = json.loads((Path(__file__).parent.parent / 'data' / 'exercise_animations.json').read_text(encoding='utf-8'))


def exercise_animation_url(exercise):
    if exercise and exercise.is_active and exercise.animation_key:
        return url_for('exercises.get_exercise_animation', filename=exercise.animation_key, _external=True)
    return None
