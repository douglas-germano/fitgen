from app import create_app, db
from app.models.exercise_library import ExerciseLibrary

app = create_app()

EXERCISES = [
    # Peito
    {
        "name": "Supino Reto com Barra",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["chest", "triceps", "front_delt"],
        "equipment_needed": ["barbell", "bench"],
        "description": "Exercício clássico para peitoral.",
        "instructions": "Deite-se no banco, segure a barra...",
        "video_url": "https://www.youtube.com/embed/rT7DgCr-3pg" 
    },
    {
        "name": "Flexão de Braço",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["chest", "triceps", "core"],
        "equipment_needed": ["bodyweight"], 
        "description": "Exercício fundamental com peso do corpo.",
        "instructions": "Mantenha o corpo reto...",
        "video_url": "https://www.youtube.com/embed/IODxDxX7oi4"
    },
    {
        "name": "Crucifixo com Halteres",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["chest"],
        "equipment_needed": ["dumbbells", "bench"],
        "description": "Isolamento para peitoral.",
        "video_url": "https://www.youtube.com/embed/eozdVDA78K0"
    },

    # Costas
    {
        "name": "Puxada Alta",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["lats", "biceps"],
        "equipment_needed": ["cable_machine"],
        "description": "Excelente para largura das costas.",
        "video_url": "https://www.youtube.com/embed/CAwf7n6Luuc"
    },
    {
        "name": "Remada Curvada com Barra",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["lats", "traps", "lower_back"],
        "equipment_needed": ["barbell"],
        "description": "Construtor de massa para costas.",
        "video_url": "https://www.youtube.com/embed/G8l_8chR5BE"
    },

    # Pernas
    {
        "name": "Agachamento Livre",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["quads", "glutes", "core"],
        "equipment_needed": ["barbell"],
        "description": "O rei dos exercícios de perna.",
        "video_url": "https://www.youtube.com/embed/UltWZb7tfkg"
    },
    {
        "name": "Leg Press 45",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["quads", "glutes"],
        "equipment_needed": ["machine"],
        "description": "Ótimo para hipertrofia de pernas com segurança.",
        "video_url": "https://www.youtube.com/embed/GvHgq030Az8"
    },
    {
        "name": "Cadeira Extensora",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["quads"],
        "equipment_needed": ["machine"],
        "description": "Isolador de quadríceps.",
        "video_url": "https://www.youtube.com/embed/YyvSfVjQeL0"
    },
    
    # Ombros
    {
        "name": "Desenvolvimento com Halteres",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["shoulders", "triceps"],
        "equipment_needed": ["dumbbells", "bench"],
        "description": "Construtor de ombros largos.",
    },
    {
        "name": "Elevação Lateral",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["side_delt"],
        "equipment_needed": ["dumbbells"],
        "description": "Isolamento para a porção lateral do ombro.",
    },

    # Bíceps/Tríceps
    {
        "name": "Rosca Direta",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["biceps"],
        "equipment_needed": ["barbell"],
        "description": "Clássico para bíceps.",
    },
    {
        "name": "Tríceps Corda",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["triceps"],
        "equipment_needed": ["cable_machine"],
        "description": "Isolamento de tríceps na polia.",
    },

    # Cardio
    {
        "name": "Corrida na Esteira",
        "category": "cardio",
        "difficulty_level": "beginner",
        "muscle_groups": ["legs", "cardio"],
        "equipment_needed": ["treadmill"],
        "description": "Cardio básico.",
    },
    {
        "name": "Elíptico",
        "category": "cardio",
        "difficulty_level": "beginner",
        "muscle_groups": ["legs", "cardio"],
        "equipment_needed": ["elliptical"],
        "description": "Cardio de baixo impacto.",
    }
]

def seed():
    with app.app_context():
        print("Seeding Exercise Library...")
        count = 0
        for ex_data in EXERCISES:
            exists = ExerciseLibrary.query.filter_by(name=ex_data['name']).first()
            if not exists:
                new_ex = ExerciseLibrary(
                    name=ex_data['name'],
                    category=ex_data['category'],
                    difficulty_level=ex_data['difficulty_level'],
                    muscle_groups=ex_data['muscle_groups'],
                    equipment_needed=ex_data['equipment_needed'],
                    description=ex_data.get('description'),
                    instructions=ex_data.get('instructions'),
                    video_url=ex_data.get('video_url')
                )
                db.session.add(new_ex)
                count += 1
                print(f"Added: {ex_data['name']}")
            else:
                print(f"Skipped: {ex_data['name']} (Already exists)")
        
        db.session.commit()
        print(f"Done! Added {count} new exercises.")

if __name__ == "__main__":
    seed()
