from app import create_app, db
from app.models.exercise_library import ExerciseLibrary

app = create_app()

EXERCISES = [
    # ═══════════════════════════════════════════════════════════════════
    # NÍVEL INICIANTE
    # ═══════════════════════════════════════════════════════════════════
    
    # --- PEITO (Iniciante) ---
    {
        "name": "Supino Reto com Barra",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["chest", "triceps", "front_delt"],
        "equipment_needed": ["barbell", "bench"],
        "description": "Exercício fundamental para desenvolvimento do peitoral.",
        "instructions": "Deite no banco, pés no chão, desça a barra até o peito e empurre.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Supino Reto com Halteres",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["chest", "triceps", "front_delt"],
        "equipment_needed": ["dumbbells", "bench"],
        "description": "Variação com halteres para maior amplitude de movimento.",
        "instructions": "Deite no banco, segure os halteres e empurre para cima.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Supino Inclinado com Halteres",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["chest", "triceps", "front_delt"],
        "equipment_needed": ["dumbbells", "bench"],
        "description": "Foco na parte superior do peitoral.",
        "instructions": "Banco inclinado a 30-45 graus, empurre os halteres para cima.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Peck Deck",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["chest"],
        "equipment_needed": ["machine"],
        "description": "Máquina para isolamento do peitoral com segurança.",
        "instructions": "Sente-se, ajuste os braços e junte-os à frente do peito.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Crucifixo Reto com Halteres",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["chest"],
        "equipment_needed": ["dumbbells", "bench"],
        "description": "Isolamento para peitoral com grande alongamento.",
        "instructions": "Deite no banco, abra os braços lateralmente e junte os halteres.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },

    # --- COSTAS (Iniciante) ---
    {
        "name": "Puxada Frontal na Máquina",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["lats", "biceps"],
        "equipment_needed": ["cable_machine"],
        "description": "Excelente para desenvolver largura das costas.",
        "instructions": "Sente-se, segure a barra e puxe até o peito.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Remada Baixa na Máquina",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["lats", "rhomboids", "biceps"],
        "equipment_needed": ["cable_machine"],
        "description": "Desenvolve espessura das costas.",
        "instructions": "Sente-se, puxe o triângulo em direção ao abdômen.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Remada Unilateral com Halter",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["lats", "rhomboids", "biceps"],
        "equipment_needed": ["dumbbells", "bench"],
        "description": "Trabalha cada lado das costas separadamente.",
        "instructions": "Apoie um joelho no banco, puxe o halter até a cintura.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Pulldown Pegada Neutra",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["lats", "biceps"],
        "equipment_needed": ["cable_machine"],
        "description": "Variação da puxada com pegada neutra.",
        "instructions": "Use o triângulo, puxe até o peito mantendo os cotovelos próximos.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Pullover na Máquina",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["lats", "chest"],
        "equipment_needed": ["machine"],
        "description": "Trabalha dorsais e serrátil com segurança.",
        "instructions": "Sente-se na máquina e puxe a barra em arco até a frente.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },

    # --- OMBROS (Iniciante) ---
    {
        "name": "Desenvolvimento com Halteres",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["shoulders", "triceps"],
        "equipment_needed": ["dumbbells", "bench"],
        "description": "Exercício básico para desenvolvimento dos ombros.",
        "instructions": "Sentado, empurre os halteres para cima até estender os braços.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Elevação Lateral com Halteres",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["side_delt"],
        "equipment_needed": ["dumbbells"],
        "description": "Isolamento para a porção lateral do deltóide.",
        "instructions": "Em pé, eleve os halteres lateralmente até a altura dos ombros.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Elevação Frontal com Halteres",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["front_delt"],
        "equipment_needed": ["dumbbells"],
        "description": "Isolamento para a porção frontal do deltóide.",
        "instructions": "Em pé, eleve os halteres à frente até a altura dos ombros.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Desenvolvimento na Máquina",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["shoulders", "triceps"],
        "equipment_needed": ["machine"],
        "description": "Desenvolvimento com trajetória guiada pela máquina.",
        "instructions": "Sente-se, ajuste o banco e empurre as alças para cima.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Elevação Lateral na Máquina",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["side_delt"],
        "equipment_needed": ["machine"],
        "description": "Elevação lateral com movimento guiado.",
        "instructions": "Sente-se na máquina e eleve os braços lateralmente.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },

    # --- BÍCEPS (Iniciante) ---
    {
        "name": "Rosca Direta com Barra",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["biceps"],
        "equipment_needed": ["barbell"],
        "description": "Exercício clássico para bíceps.",
        "instructions": "Em pé, flexione os cotovelos e suba a barra.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Rosca Alternada com Halteres",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["biceps"],
        "equipment_needed": ["dumbbells"],
        "description": "Rosca alternando os braços para melhor concentração.",
        "instructions": "Em pé, flexione um braço de cada vez.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Rosca Scott na Máquina",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["biceps"],
        "equipment_needed": ["machine"],
        "description": "Rosca com apoio para isolamento do bíceps.",
        "instructions": "Apoie os braços no suporte e flexione.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Rosca Concentrada",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["biceps"],
        "equipment_needed": ["dumbbells"],
        "description": "Máximo isolamento do bíceps.",
        "instructions": "Sentado, apoie o cotovelo na coxa e flexione.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Rosca Direta na Máquina",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["biceps"],
        "equipment_needed": ["machine"],
        "description": "Rosca com movimento guiado pela máquina.",
        "instructions": "Sente-se na máquina e flexione os braços.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },

    # --- TRÍCEPS (Iniciante) ---
    {
        "name": "Tríceps Pulley Barra Reta",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["triceps"],
        "equipment_needed": ["cable_machine"],
        "description": "Exercício básico para tríceps na polia.",
        "instructions": "Em pé, empurre a barra para baixo estendendo os cotovelos.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Tríceps Corda",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["triceps"],
        "equipment_needed": ["cable_machine"],
        "description": "Tríceps na polia com corda para maior contração.",
        "instructions": "Empurre a corda para baixo e abra no final do movimento.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Tríceps Testa com Barra EZ",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["triceps"],
        "equipment_needed": ["ez_bar", "bench"],
        "description": "Exercício para a cabeça longa do tríceps.",
        "instructions": "Deitado, desça a barra até a testa e estenda.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Tríceps Banco",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["triceps"],
        "equipment_needed": ["bench", "bodyweight"],
        "description": "Tríceps com peso corporal usando o banco.",
        "instructions": "Apoie as mãos no banco atrás, desça e suba o corpo.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Tríceps Máquina",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["triceps"],
        "equipment_needed": ["machine"],
        "description": "Tríceps com movimento guiado.",
        "instructions": "Sente-se na máquina e estenda os braços.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },

    # --- PERNAS (Iniciante) ---
    {
        "name": "Leg Press 45°",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["quads", "glutes", "hamstrings"],
        "equipment_needed": ["machine"],
        "description": "Exercício completo para pernas com segurança.",
        "instructions": "Posicione os pés na plataforma e empurre.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Agachamento no Smith",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["quads", "glutes", "core"],
        "equipment_needed": ["smith_machine"],
        "description": "Agachamento com barra guiada para segurança.",
        "instructions": "Posicione a barra nos ombros, agache e suba.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Cadeira Extensora",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["quads"],
        "equipment_needed": ["machine"],
        "description": "Isolamento para quadríceps.",
        "instructions": "Sente-se e estenda as pernas.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Cadeira Flexora",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["hamstrings"],
        "equipment_needed": ["machine"],
        "description": "Isolamento para posterior de coxa sentado.",
        "instructions": "Sente-se e flexione as pernas.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Mesa Flexora",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["hamstrings"],
        "equipment_needed": ["machine"],
        "description": "Isolamento para posterior de coxa deitado.",
        "instructions": "Deite de bruços e flexione as pernas.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Panturrilha em Pé na Máquina",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["calves"],
        "equipment_needed": ["machine"],
        "description": "Exercício para gastrocnêmio em pé.",
        "instructions": "Posicione os ombros no apoio e suba na ponta dos pés.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Panturrilha Sentado",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["calves"],
        "equipment_needed": ["machine"],
        "description": "Exercício para sóleo sentado.",
        "instructions": "Sente-se na máquina e suba na ponta dos pés.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },

    # --- ABDÔMEN (Iniciante) ---
    {
        "name": "Abdominal Crunch no Solo",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["abs"],
        "equipment_needed": ["bodyweight"],
        "description": "Exercício básico para reto abdominal.",
        "instructions": "Deitado, flexione o tronco elevando os ombros do solo.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Abdominal Máquina",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["abs"],
        "equipment_needed": ["machine"],
        "description": "Abdominal com carga na máquina.",
        "instructions": "Sente-se na máquina e flexione o tronco.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Elevação de Joelhos na Paralela",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["abs", "hip_flexors"],
        "equipment_needed": ["parallel_bars"],
        "description": "Trabalha abdômen inferior.",
        "instructions": "Apoie os antebraços e eleve os joelhos.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Prancha Abdominal",
        "category": "strength",
        "difficulty_level": "beginner",
        "muscle_groups": ["abs", "core"],
        "equipment_needed": ["bodyweight"],
        "description": "Exercício isométrico para core.",
        "instructions": "Mantenha o corpo reto apoiado nos antebraços e pontas dos pés.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },

    # ═══════════════════════════════════════════════════════════════════
    # NÍVEL INTERMEDIÁRIO
    # ═══════════════════════════════════════════════════════════════════

    # --- PEITO (Intermediário) ---
    {
        "name": "Supino Reto com Barra - Progressão de Carga",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["chest", "triceps", "front_delt"],
        "equipment_needed": ["barbell", "bench"],
        "description": "Supino com foco em progressão de carga.",
        "instructions": "Execute o supino com cargas progressivamente maiores.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Supino Inclinado com Barra",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["chest", "triceps", "front_delt"],
        "equipment_needed": ["barbell", "bench"],
        "description": "Supino inclinado para peitoral superior.",
        "instructions": "Banco a 30-45 graus, desça a barra ao peitoral superior.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Supino Declinado com Halteres",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["chest", "triceps"],
        "equipment_needed": ["dumbbells", "bench"],
        "description": "Foco na parte inferior do peitoral.",
        "instructions": "Banco declinado, empurre os halteres para cima.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Crucifixo Inclinado com Halteres",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["chest"],
        "equipment_needed": ["dumbbells", "bench"],
        "description": "Isolamento para peitoral superior.",
        "instructions": "Banco inclinado, execute o crucifixo.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Peck Deck + Flexão de Braços (Bi-Set)",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["chest", "triceps"],
        "equipment_needed": ["machine", "bodyweight"],
        "description": "Bi-set para maior intensidade no peitoral.",
        "instructions": "Execute peck deck e imediatamente faça flexões.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Crossover na Polia",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["chest"],
        "equipment_needed": ["cable_machine"],
        "description": "Isolamento para peitoral com cabos.",
        "instructions": "Em pé entre as polias, junte as mãos à frente.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },

    # --- COSTAS (Intermediário) ---
    {
        "name": "Barra Fixa",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["lats", "biceps", "core"],
        "equipment_needed": ["pull_up_bar"],
        "description": "Exercício fundamental para costas.",
        "instructions": "Pendure-se na barra e puxe o corpo para cima.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Remada Curvada com Barra",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["lats", "rhomboids", "lower_back"],
        "equipment_needed": ["barbell"],
        "description": "Construtor de massa para costas.",
        "instructions": "Incline o tronco, puxe a barra até o abdômen.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Remada Cavalinho",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["lats", "rhomboids"],
        "equipment_needed": ["machine"],
        "description": "Remada com apoio no peito.",
        "instructions": "Apoie o peito no suporte e puxe as alças.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Puxada Frontal Pegada Aberta",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["lats", "biceps"],
        "equipment_needed": ["cable_machine"],
        "description": "Puxada com pegada mais aberta para largura.",
        "instructions": "Pegada ampla, puxe a barra até o peito.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Remada Unilateral na Polia",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["lats", "rhomboids"],
        "equipment_needed": ["cable_machine"],
        "description": "Remada unilateral para trabalho isolado.",
        "instructions": "Puxe a polia com um braço de cada vez.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Pullover com Halter",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["lats", "chest", "serratus"],
        "equipment_needed": ["dumbbells", "bench"],
        "description": "Trabalha dorsais e peitoral.",
        "instructions": "Deitado, leve o halter atrás da cabeça e retorne.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },

    # --- OMBROS (Intermediário) ---
    {
        "name": "Desenvolvimento com Barra",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["shoulders", "triceps"],
        "equipment_needed": ["barbell", "bench"],
        "description": "Desenvolvimento com barra para força.",
        "instructions": "Sentado ou em pé, empurre a barra para cima.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Elevação Lateral com Halteres - Dropset",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["side_delt"],
        "equipment_needed": ["dumbbells"],
        "description": "Elevação lateral com técnica dropset.",
        "instructions": "Execute até a falha, reduza o peso e continue.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Elevação Lateral na Polia",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["side_delt"],
        "equipment_needed": ["cable_machine"],
        "description": "Elevação lateral com tensão constante.",
        "instructions": "Eleve o braço lateralmente usando a polia baixa.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Elevação Frontal com Barra",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["front_delt"],
        "equipment_needed": ["barbell"],
        "description": "Elevação frontal com barra para mais carga.",
        "instructions": "Em pé, eleve a barra à frente até os ombros.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Remada Alta com Barra",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["traps", "side_delt"],
        "equipment_needed": ["barbell"],
        "description": "Trabalha trapézio e deltóide lateral.",
        "instructions": "Em pé, puxe a barra até o queixo.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Crucifixo Inverso na Máquina",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["rear_delt", "rhomboids"],
        "equipment_needed": ["machine"],
        "description": "Isolamento para deltóide posterior.",
        "instructions": "Sente-se de frente para o encosto e abra os braços.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },

    # --- BÍCEPS (Intermediário) ---
    {
        "name": "Rosca Direta com Barra - Progressão de Carga",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["biceps"],
        "equipment_needed": ["barbell"],
        "description": "Rosca direta com foco em progressão.",
        "instructions": "Execute com cargas progressivamente maiores.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Rosca Alternada no Banco Inclinado",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["biceps"],
        "equipment_needed": ["dumbbells", "bench"],
        "description": "Rosca com maior alongamento do bíceps.",
        "instructions": "Deitado no banco inclinado, flexione alternadamente.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Rosca Scott com Barra EZ",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["biceps"],
        "equipment_needed": ["ez_bar", "preacher_bench"],
        "description": "Isolamento máximo para bíceps.",
        "instructions": "Apoie os braços no banco Scott e flexione.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Rosca Martelo",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["biceps", "brachialis"],
        "equipment_needed": ["dumbbells"],
        "description": "Trabalha bíceps e braquial.",
        "instructions": "Pegada neutra, flexione sem girar o punho.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Rosca Direta + Martelo (Bi-Set)",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["biceps", "brachialis"],
        "equipment_needed": ["dumbbells"],
        "description": "Bi-set para intensidade no bíceps.",
        "instructions": "Execute rosca direta e imediatamente rosca martelo.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },

    # --- TRÍCEPS (Intermediário) ---
    {
        "name": "Tríceps Testa com Barra EZ - Intermediário",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["triceps"],
        "equipment_needed": ["ez_bar", "bench"],
        "description": "Tríceps testa com maior carga.",
        "instructions": "Deitado, desça a barra até a testa e estenda.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Tríceps Francês com Halter",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["triceps"],
        "equipment_needed": ["dumbbells"],
        "description": "Exercício para cabeça longa do tríceps.",
        "instructions": "Sentado, desça o halter atrás da cabeça e estenda.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Tríceps Corda - Dropset",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["triceps"],
        "equipment_needed": ["cable_machine"],
        "description": "Tríceps corda com técnica dropset.",
        "instructions": "Execute até a falha, reduza o peso e continue.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Tríceps Mergulho nas Paralelas",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["triceps", "chest"],
        "equipment_needed": ["parallel_bars"],
        "description": "Exercício composto para tríceps.",
        "instructions": "Nas paralelas, desça e suba o corpo.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Tríceps Pulley Inverso",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["triceps"],
        "equipment_needed": ["cable_machine"],
        "description": "Tríceps com pegada supinada.",
        "instructions": "Pegada invertida, empurre a barra para baixo.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },

    # --- PERNAS (Intermediário) ---
    {
        "name": "Agachamento Livre",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["quads", "glutes", "core", "hamstrings"],
        "equipment_needed": ["barbell", "squat_rack"],
        "description": "O rei dos exercícios de perna.",
        "instructions": "Barra nos ombros, agache até paralelo e suba.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Leg Press - Dropset",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["quads", "glutes"],
        "equipment_needed": ["machine"],
        "description": "Leg press com técnica dropset.",
        "instructions": "Execute até a falha, reduza o peso e continue.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Afundo com Halteres",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["quads", "glutes", "hamstrings"],
        "equipment_needed": ["dumbbells"],
        "description": "Exercício unilateral para pernas.",
        "instructions": "Dê um passo à frente e desça até o joelho quase tocar o chão.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Cadeira Extensora + Agachamento (Bi-Set)",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["quads"],
        "equipment_needed": ["machine", "barbell"],
        "description": "Bi-set para pré-exaustão de quadríceps.",
        "instructions": "Execute extensora e imediatamente agachamento.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Stiff com Barra",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["hamstrings", "glutes", "lower_back"],
        "equipment_needed": ["barbell"],
        "description": "Exercício para posterior de coxa.",
        "instructions": "Pernas semi-estendidas, desça a barra e suba.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Panturrilha em Pé - Rest-Pause",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["calves"],
        "equipment_needed": ["machine"],
        "description": "Panturrilha com técnica rest-pause.",
        "instructions": "Execute até a falha, descanse 10s e continue.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },

    # --- ABDÔMEN (Intermediário) ---
    {
        "name": "Abdominal Infra no Banco",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["abs", "hip_flexors"],
        "equipment_needed": ["bench"],
        "description": "Trabalha abdômen inferior.",
        "instructions": "Deitado no banco, eleve as pernas.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Abdominal Oblíquo na Polia",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["obliques"],
        "equipment_needed": ["cable_machine"],
        "description": "Trabalha oblíquos com carga.",
        "instructions": "Puxe a polia lateralmente flexionando o tronco.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Prancha com Carga",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["abs", "core"],
        "equipment_needed": ["weight_plate"],
        "description": "Prancha com carga adicional nas costas.",
        "instructions": "Mantenha a prancha com anilha nas costas.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Abdominal Máquina - Dropset",
        "category": "strength",
        "difficulty_level": "intermediate",
        "muscle_groups": ["abs"],
        "equipment_needed": ["machine"],
        "description": "Abdominal na máquina com dropset.",
        "instructions": "Execute até a falha, reduza o peso e continue.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },

    # ═══════════════════════════════════════════════════════════════════
    # NÍVEL AVANÇADO
    # ═══════════════════════════════════════════════════════════════════

    # --- PEITO (Avançado) ---
    {
        "name": "Supino Reto com Barra - Progressão Pesada",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["chest", "triceps", "front_delt"],
        "equipment_needed": ["barbell", "bench"],
        "description": "Supino pesado para força máxima.",
        "instructions": "Execute com cargas altas e baixas repetições.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Supino Inclinado com Halteres - Dropset",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["chest", "triceps", "front_delt"],
        "equipment_needed": ["dumbbells", "bench"],
        "description": "Supino inclinado com técnica avançada.",
        "instructions": "Execute até a falha, reduza o peso e continue.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Supino Declinado com Barra",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["chest", "triceps"],
        "equipment_needed": ["barbell", "bench"],
        "description": "Foco intenso na parte inferior do peitoral.",
        "instructions": "Banco declinado, execute o supino.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Crucifixo Inclinado na Polia",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["chest"],
        "equipment_needed": ["cable_machine", "bench"],
        "description": "Crucifixo com tensão constante dos cabos.",
        "instructions": "Banco inclinado entre as polias, execute o crucifixo.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Crossover + Flexão (Bi-Set)",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["chest", "triceps"],
        "equipment_needed": ["cable_machine", "bodyweight"],
        "description": "Bi-set avançado para peitoral.",
        "instructions": "Execute crossover e imediatamente flexões.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Peck Deck - Rest-Pause",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["chest"],
        "equipment_needed": ["machine"],
        "description": "Peck deck com técnica rest-pause.",
        "instructions": "Execute até a falha, descanse 10s e continue.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },

    # --- COSTAS (Avançado) ---
    {
        "name": "Barra Fixa com Carga",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["lats", "biceps", "core"],
        "equipment_needed": ["pull_up_bar", "weight_belt"],
        "description": "Barra fixa com peso adicional.",
        "instructions": "Use cinto com anilha e execute a barra fixa.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Remada Curvada com Barra - Progressão",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["lats", "rhomboids", "lower_back"],
        "equipment_needed": ["barbell"],
        "description": "Remada pesada para força nas costas.",
        "instructions": "Execute com cargas progressivamente maiores.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Remada Cavalinho com Carga Alta",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["lats", "rhomboids"],
        "equipment_needed": ["machine"],
        "description": "Remada cavalinho com alta intensidade.",
        "instructions": "Use cargas altas mantendo a técnica.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Puxada Unilateral na Polia",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["lats"],
        "equipment_needed": ["cable_machine"],
        "description": "Puxada unilateral para máximo foco.",
        "instructions": "Puxe com um braço de cada vez.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Pulldown Fechado",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["lats", "biceps"],
        "equipment_needed": ["cable_machine"],
        "description": "Puxada com pegada fechada para espessura.",
        "instructions": "Pegada próxima, puxe até o peito.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Pullover na Polia - Dropset",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["lats", "serratus"],
        "equipment_needed": ["cable_machine"],
        "description": "Pullover na polia com dropset.",
        "instructions": "Execute até a falha, reduza o peso e continue.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },

    # --- OMBROS (Avançado) ---
    {
        "name": "Desenvolvimento Militar com Barra",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["shoulders", "triceps", "core"],
        "equipment_needed": ["barbell"],
        "description": "Desenvolvimento em pé para força total.",
        "instructions": "Em pé, empurre a barra acima da cabeça.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Elevação Lateral com Halteres - Dropset Triplo",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["side_delt"],
        "equipment_needed": ["dumbbells"],
        "description": "Elevação lateral com três quedas de peso.",
        "instructions": "Execute dropset com três reduções de peso.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Elevação Lateral na Polia Unilateral",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["side_delt"],
        "equipment_needed": ["cable_machine"],
        "description": "Elevação lateral unilateral para máximo foco.",
        "instructions": "Execute com um braço de cada vez na polia.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Crucifixo Inverso com Halteres",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["rear_delt", "rhomboids"],
        "equipment_needed": ["dumbbells", "bench"],
        "description": "Isolamento para deltóide posterior.",
        "instructions": "Inclinado, abra os braços lateralmente.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Remada Alta Pegada Aberta",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["traps", "side_delt"],
        "equipment_needed": ["barbell"],
        "description": "Remada alta com maior ênfase nos deltóides.",
        "instructions": "Pegada ampla, puxe a barra até o peito.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Desenvolvimento Arnold",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["shoulders", "triceps"],
        "equipment_needed": ["dumbbells"],
        "description": "Variação clássica com rotação.",
        "instructions": "Comece com palmas para dentro e gire durante o movimento.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },

    # --- BÍCEPS (Avançado) ---
    {
        "name": "Rosca Direta com Barra - Cluster Set",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["biceps"],
        "equipment_needed": ["barbell"],
        "description": "Rosca com técnica cluster para força.",
        "instructions": "Execute 3-4 reps, descanse 15s, repita.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Rosca Alternada no Banco Inclinado - Dropset",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["biceps"],
        "equipment_needed": ["dumbbells", "bench"],
        "description": "Rosca inclinada com dropset.",
        "instructions": "Execute até a falha, reduza o peso e continue.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Rosca Scott Unilateral",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["biceps"],
        "equipment_needed": ["dumbbells", "preacher_bench"],
        "description": "Rosca Scott com um braço para máximo foco.",
        "instructions": "Execute com um braço de cada vez.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Rosca Martelo Cruzada",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["biceps", "brachialis"],
        "equipment_needed": ["dumbbells"],
        "description": "Rosca martelo cruzando o corpo.",
        "instructions": "Flexione cruzando o halter em direção ao ombro oposto.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Rosca 21",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["biceps"],
        "equipment_needed": ["barbell"],
        "description": "Técnica 21 para máximo pump.",
        "instructions": "7 reps parciais baixas, 7 altas, 7 completas.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },

    # --- TRÍCEPS (Avançado) ---
    {
        "name": "Tríceps Testa com Barra EZ - Dropset",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["triceps"],
        "equipment_needed": ["ez_bar", "bench"],
        "description": "Tríceps testa com técnica dropset.",
        "instructions": "Execute até a falha, reduza o peso e continue.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Tríceps Francês Unilateral",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["triceps"],
        "equipment_needed": ["dumbbells"],
        "description": "Francês com um braço para máximo foco.",
        "instructions": "Execute com um braço de cada vez.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Tríceps Corda - Rest-Pause",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["triceps"],
        "equipment_needed": ["cable_machine"],
        "description": "Tríceps corda com rest-pause.",
        "instructions": "Execute até a falha, descanse 10s e continue.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Tríceps Mergulho com Carga",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["triceps", "chest"],
        "equipment_needed": ["parallel_bars", "weight_belt"],
        "description": "Mergulho nas paralelas com peso adicional.",
        "instructions": "Use cinto com anilha e execute o mergulho.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Tríceps Pulley Barra V",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["triceps"],
        "equipment_needed": ["cable_machine"],
        "description": "Tríceps com barra V para variação.",
        "instructions": "Empurre a barra V para baixo.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },

    # --- PERNAS (Avançado) ---
    {
        "name": "Agachamento Livre Pesado",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["quads", "glutes", "core", "hamstrings"],
        "equipment_needed": ["barbell", "squat_rack"],
        "description": "Agachamento pesado para força máxima.",
        "instructions": "Execute com cargas altas e baixas repetições.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Hack Machine",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["quads", "glutes"],
        "equipment_needed": ["machine"],
        "description": "Agachamento na máquina hack.",
        "instructions": "Posicione nos apoios e agache.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Leg Press - Dropset + Rest-Pause",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["quads", "glutes"],
        "equipment_needed": ["machine"],
        "description": "Leg press com técnicas combinadas.",
        "instructions": "Dropset seguido de rest-pause.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Levantamento Terra Romeno",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["hamstrings", "glutes", "lower_back"],
        "equipment_needed": ["barbell"],
        "description": "Variação do stiff para posterior.",
        "instructions": "Pernas levemente flexionadas, desça a barra.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Mesa Flexora Unilateral",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["hamstrings"],
        "equipment_needed": ["machine"],
        "description": "Flexora com uma perna para máximo foco.",
        "instructions": "Execute com uma perna de cada vez.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Panturrilha no Leg Press - Dropset",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["calves"],
        "equipment_needed": ["machine"],
        "description": "Panturrilha no leg press com dropset.",
        "instructions": "Execute até a falha, reduza o peso e continue.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },

    # --- ABDÔMEN (Avançado) ---
    {
        "name": "Abdominal Infra Suspenso com Carga",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["abs", "hip_flexors"],
        "equipment_needed": ["pull_up_bar", "ankle_weights"],
        "description": "Elevação de pernas pendurado com carga.",
        "instructions": "Pendurado na barra, eleve as pernas com caneleira.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Abdominal na Polia Pesada",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["abs"],
        "equipment_needed": ["cable_machine"],
        "description": "Abdominal ajoelhado na polia com carga alta.",
        "instructions": "Ajoelhado, flexione o tronco puxando a corda.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Prancha com Carga e Tempo Prolongado",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["abs", "core"],
        "equipment_needed": ["weight_plate"],
        "description": "Prancha com carga por tempo estendido.",
        "instructions": "Mantenha por 60-90 segundos com anilha nas costas.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
    {
        "name": "Ab Wheel - Roda Abdominal",
        "category": "strength",
        "difficulty_level": "advanced",
        "muscle_groups": ["abs", "core"],
        "equipment_needed": ["ab_wheel"],
        "description": "Exercício avançado com roda abdominal.",
        "instructions": "Role a roda para frente e retorne controladamente.",
        "video_url": "https://www.youtube.com/embed/placeholder"
    },
]

def seed():
    with app.app_context():
        print("=" * 60)
        print("Seeding Exercise Library...")
        print("=" * 60)
        
        count_added = 0
        count_skipped = 0
        
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
                count_added += 1
                print(f"✓ Added: {ex_data['name']}")
            else:
                count_skipped += 1
                print(f"⊘ Skipped: {ex_data['name']} (Already exists)")
        
        db.session.commit()
        
        print("=" * 60)
        print(f"Done!")
        print(f"  Added: {count_added} new exercises")
        print(f"  Skipped: {count_skipped} existing exercises")
        print(f"  Total in list: {len(EXERCISES)}")
        print("=" * 60)

if __name__ == "__main__":
    seed()