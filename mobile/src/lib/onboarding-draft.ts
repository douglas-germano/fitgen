import * as SecureStore from './storage';
import { cleanAnswers, onboardingSteps, type Answers } from './onboarding';

// Each encrypted value stays below the historical 2 KB keychain limit, including UTF-8.
const prefix = (user: string, key: string) => `fitgen.onboard.v1.${user}.${key}`;
let sequence = 0;
type Pointer = { generation: string; count: number };
async function pointer(key: string): Promise<Pointer | null> {
  try {
    const value = JSON.parse(await SecureStore.getItemAsync(key) ?? 'null');
    return value && typeof value.generation === 'string' && /^\d+$/.test(value.generation) && Number.isInteger(value.count) && value.count > 0 && value.count < 16 ? value : null;
  } catch { return null; }
}
async function removeParts(key: string, p: Pointer | null) {
  if (p) await Promise.all(Array.from({ length: p.count }, (_, i) => SecureStore.deleteItemAsync(`${key}.${p.generation}.${i}`)));
}
export async function readOnboardingDraft(user: string): Promise<Answers> {
  const pairs = await Promise.all(onboardingSteps.map(async step => {
    const key = prefix(user, step.key), p = await pointer(key);
    if (!p) return [];
    try {
      const parts = await Promise.all(Array.from({ length: p.count }, (_, i) => SecureStore.getItemAsync(`${key}.${p.generation}.${i}`)));
      if (parts.some(part => part === null)) return [];
      return [step.key, JSON.parse(parts.join(''))];
    } catch { return []; }
  }));
  return cleanAnswers(Object.fromEntries(pairs.filter(p => p.length === 2)));
}
export async function writeOnboardingAnswer(user: string, field: string, value: string | string[]) {
  const key = prefix(user, field), previous = await pointer(key);
  const serialized = JSON.stringify(value), generation = `${Date.now()}${++sequence}`;
  const characters = Array.from(serialized);
  const parts = Array.from({ length: Math.ceil(characters.length / 300) }, (_, i) => characters.slice(i * 300, (i + 1) * 300).join(''));
  await Promise.all(parts.map((part, i) => SecureStore.setItemAsync(`${key}.${generation}.${i}`, part)));
  // A pointer only changes after every part is durable; interrupted writes retain the old answer.
  await SecureStore.setItemAsync(key, JSON.stringify({ generation, count: parts.length }));
  if (previous?.generation !== generation) await removeParts(key, previous);
}
export async function clearOnboardingDraft(user: string) {
  await Promise.all(onboardingSteps.map(async step => {
    const key = prefix(user, step.key), p = await pointer(key);
    await SecureStore.deleteItemAsync(key);
    await removeParts(key, p);
  }));
}
