export type CoachTool = 'adapt' | 'week' | 'diet';
export type CoachToolRequest = {
  tool: CoachTool;
  minutes?: number;
  equipment?: 'any' | 'dumbbells' | 'bodyweight';
  topic?: 'training' | 'nutrition';
  ingredient?: string;
};

export function coachToolForMessage(message: string): CoachToolRequest | undefined {
  const text = message.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
  if (/^(?:como foi|minha|revisar|revise|resuma)\b.*\bsemana\b/.test(text)) {
    return { tool: 'week', topic: /\b(dieta|alimentacao|refeicoes|diario)\b/.test(text) ? 'nutrition' : 'training' };
  }
  const time = /\b(\d{1,2})\s*(?:minutos?|min)\b/.exec(text);
  if (time && /^(?:(?:hoje )?(?:so )?tenho|adapt[ae]r? (?:o |meu )?treino)/.test(text) &&
      !/\b(dor|lesao|machucad[oa]|doente)\b/.test(text)) {
    const minutes = Number(time[1]);
    if (minutes >= 5 && minutes <= 90) {
      return { tool: 'adapt', minutes, equipment: text.includes('sem equipamento') ? 'bodyweight' : text.includes('halter') ? 'dumbbells' : 'any' };
    }
  }
  const missing = /^(?:hoje\s+)?n[aã]o tenho\s+([^.!?]{2,80})[.!?]?$/i.exec(message.trim());
  if (missing && !/\b(tempo|equipamento|halter|academia|trein)/.test(text)) {
    return { tool: 'diet', ingredient: missing[1].trim() };
  }
}
