import type { LibraryExercise } from '@/types/api';

/** Labels for the keys the backend catalog uses (backend/app/modules/training/data/exercise_catalog.py). */
export const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Peito', upper_chest: 'Peito superior', lats: 'Dorsal', upper_back: 'Costas',
  traps: 'Trapézio', lower_back: 'Lombar', front_delt: 'Ombro anterior', side_delt: 'Ombro lateral',
  rear_delt: 'Ombro posterior', biceps: 'Bíceps', triceps: 'Tríceps', forearms: 'Antebraço',
  abs: 'Abdômen', obliques: 'Oblíquos', quads: 'Quadríceps', hamstrings: 'Posterior de coxa',
  glutes: 'Glúteos', adductors: 'Adutores', abductors: 'Abdutores', calves: 'Panturrilha',
  hip_flexors: 'Flexores do quadril', full_body: 'Corpo todo',
  // Older AI plans name their days' groups with these keys too.
  shoulders: 'Ombros', back: 'Costas', legs: 'Pernas', core: 'Core', arms: 'Braços', cardio: 'Cardio',
};

export const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: 'Barra', dumbbells: 'Halteres', kettlebell: 'Kettlebell', ez_bar: 'Barra W',
  machine: 'Máquina', cable: 'Polia', smith_machine: 'Smith', bench: 'Banco',
  pull_up_bar: 'Barra fixa', parallel_bars: 'Paralelas', resistance_band: 'Elástico',
  bodyweight: 'Peso do corpo', mat: 'Colchonete', box: 'Caixote', jump_rope: 'Corda',
  cardio_machine: 'Aparelho de cardio', ab_wheel: 'Roda abdominal', weight_plate: 'Anilha',
};

export const LEVEL_LABELS: Record<LibraryExercise['difficulty_level'], string> = {
  beginner: 'Iniciante', intermediate: 'Intermediário', advanced: 'Avançado',
};

export const CATEGORY_LABELS: Record<LibraryExercise['category'], string> = {
  strength: 'Força', cardio: 'Cardio', flexibility: 'Mobilidade', balance: 'Equilíbrio', plyometric: 'Pliometria',
};

export const muscleLabel = (key: string) => MUSCLE_LABELS[key] ?? key;
export const equipmentLabel = (key: string) => EQUIPMENT_LABELS[key] ?? key;

/** Body regions for the filter chips, by the exercise's primary muscle (or its category). */
export type Region = 'all' | 'chest' | 'back' | 'shoulders' | 'arms' | 'core' | 'legs' | 'glutes' | 'cardio' | 'mobility';

export const REGIONS: { value: Region; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'chest', label: 'Peito' },
  { value: 'back', label: 'Costas' },
  { value: 'shoulders', label: 'Ombros' },
  { value: 'arms', label: 'Braços' },
  { value: 'core', label: 'Abdômen' },
  { value: 'legs', label: 'Pernas' },
  { value: 'glutes', label: 'Glúteos' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'mobility', label: 'Mobilidade' },
];

const REGION_OF: Record<string, Region> = {
  chest: 'chest', upper_chest: 'chest',
  lats: 'back', upper_back: 'back', traps: 'back', lower_back: 'back',
  front_delt: 'shoulders', side_delt: 'shoulders', rear_delt: 'shoulders',
  biceps: 'arms', triceps: 'arms', forearms: 'arms',
  abs: 'core', obliques: 'core', hip_flexors: 'core',
  quads: 'legs', hamstrings: 'legs', adductors: 'legs', calves: 'legs',
  glutes: 'glutes', abductors: 'glutes',
};

export function regionOf(ex: LibraryExercise): Region | undefined {
  if (ex.category === 'cardio' || ex.category === 'plyometric') return 'cardio';
  if (ex.category === 'flexibility' || ex.category === 'balance') return 'mobility';
  return REGION_OF[ex.muscle_groups[0]];
}

/** Can be done at home: only the body, a mat, a band or a jump rope. */
const HOME_GEAR = new Set(['bodyweight', 'mat', 'resistance_band', 'jump_rope']);
export const isHomeFriendly = (ex: LibraryExercise) => ex.equipment_needed.every((e) => HOME_GEAR.has(e));

/** Lowercase without accents, so "supino inclinado" finds "Supino Inclinado" and "biceps" finds "Bíceps". */
export const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Words searched for an exercise: its name, muscles and equipment. */
const haystack = (ex: LibraryExercise) =>
  fold([ex.name, ...ex.muscle_groups.map(muscleLabel), ...ex.equipment_needed.map(equipmentLabel)].join(' '));

export function filterLibrary(items: LibraryExercise[], { query = '', region = 'all', home = false }: {
  query?: string;
  region?: Region;
  home?: boolean;
}) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  return items.filter((ex) =>
    (region === 'all' || regionOf(ex) === region) &&
    (!home || isHomeFriendly(ex)) &&
    (!words.length || words.every((w) => haystack(ex).includes(w))),
  );
}

/** "Peito · Halteres · Iniciante" */
export function exerciseCaption(ex: LibraryExercise) {
  const gear = ex.equipment_needed.filter((e) => e !== 'bench' && e !== 'mat');
  return [
    ex.muscle_groups[0] ? muscleLabel(ex.muscle_groups[0]) : null,
    gear.length ? equipmentLabel(gear[0]) : null,
    LEVEL_LABELS[ex.difficulty_level],
  ].filter(Boolean).join(' · ');
}
