/** Conversational onboarding: stable keys are also the API and encrypted draft contract. */
export type Answers = Record<string, string | string[]>;
export type Step = {
  key: string; section: string; question: string; hint?: string;
  kind: 'text' | 'number' | 'single' | 'multi' | 'date' | 'time';
  options?: { value: string; label: string }[]; optional?: boolean;
  unit?: string; min?: number; max?: number; placeholder?: string;
};
const options = (items: string[][]) => items.map(([value, label]) => ({ value, label }));
const basic = 'Sobre você', training = 'Seu treino', nutrition = 'Sua alimentação';
export const onboardingSteps: Step[] = [
  { key: 'name', section: basic, question: 'Como você quer que eu te chame?', kind: 'text', max: 100, placeholder: 'Seu nome' },
  { key: 'goal', section: basic, question: 'O que você quer conquistar agora?', kind: 'single', options: options([['lose_weight','Perder gordura'],['gain_muscle','Ganhar massa muscular'],['maintain','Manter meu peso'],['gain_strength','Ganhar força'],['improve_health','Cuidar da minha saúde']]) },
  { key: 'gender', section: basic, question: 'Qual é o seu gênero?', hint: 'Essa informação faz parte do seu perfil. Você também pode escolher “Outro”.', kind: 'single', options: options([['male','Masculino'],['female','Feminino'],['other','Outro']]) },
  { key: 'birth_date', section: basic, question: 'Quando você nasceu?', kind: 'date', placeholder: 'DD/MM/AAAA' },
  { key: 'height', section: basic, question: 'Qual é a sua altura?', kind: 'number', unit: 'cm', min: 100, max: 250, placeholder: 'Ex.: 175' },
  { key: 'weight', section: basic, question: 'Quanto você pesa hoje?', kind: 'number', unit: 'kg', min: 20, max: 350, placeholder: 'Ex.: 72,5' },
  { key: 'target_weight', section: basic, question: 'Qual peso você quer alcançar ou manter?', hint: 'Você pode ajustar sua meta depois, no perfil.', kind: 'number', unit: 'kg', min: 20, max: 350, placeholder: 'Sua meta em kg' },
  { key: 'experience', section: training, question: 'Como está sua experiência com os treinos?', kind: 'single', options: options([['beginner','Estou começando ou voltando'],['intermediate','Já treino com frequência'],['advanced','Tenho bastante experiência']]) },
  { key: 'focus', section: training, question: 'Qual foco combina mais com seu treino?', kind: 'single', options: options([['hypertrophy','Hipertrofia'],['strength','Força'],['conditioning','Condicionamento'],['health','Saúde e disposição']]) },
  { key: 'muscles', section: training, question: 'Quer dar atenção especial a algum grupo muscular?', hint: 'Escolha até 3. O plano continua trabalhando o corpo todo.', kind: 'multi', optional: true, max: 3, options: options([['chest','Peito'],['back','Costas'],['shoulders','Ombros'],['arms','Braços'],['abs','Abdômen'],['glutes','Glúteos'],['legs','Pernas']]) },
  { key: 'days', section: training, question: 'Quais dias funcionam para você treinar?', hint: 'Escolha pelo menos um dia da sua semana.', kind: 'multi', min: 1, max: 7, options: options([['monday','Segunda'],['tuesday','Terça'],['wednesday','Quarta'],['thursday','Quinta'],['friday','Sexta'],['saturday','Sábado'],['sunday','Domingo']]) },
  { key: 'duration', section: training, question: 'Quanto tempo você tem por treino?', kind: 'single', options: options([['30','30 minutos'],['45','45 minutos'],['60','1 hora'],['90','1 hora e meia']]) },
  { key: 'location', section: training, question: 'Onde você vai treinar?', kind: 'single', options: options([['gym','Academia completa'],['home','Em casa, com halteres'],['bodyweight','Em casa, sem equipamentos']]) },
  { key: 'injuries', section: training, question: 'Tem alguma lesão ou limitação que eu deva considerar?', hint: 'Descreva os movimentos que precisa evitar ou pule se não houver.', kind: 'text', optional: true, max: 600, placeholder: 'Ex.: limitação no joelho direito' },
  { key: 'training_time', section: training, question: 'Em qual horário você costuma treinar?', hint: 'Vamos guardar como preferência. Isso não ativa lembretes automaticamente.', kind: 'time', optional: true, placeholder: 'HH:MM' },
  { key: 'activity', section: training, question: 'E fora do treino, como é sua rotina?', kind: 'single', options: options([['sedentary','Passo a maior parte do dia sentado'],['light','Me movimento um pouco'],['moderate','Alterno entre sentar e me movimentar'],['active','Passo boa parte do dia em movimento'],['very_active','Minha rotina exige bastante esforço físico']]) },
  { key: 'meals', section: nutrition, question: 'Quais refeições fazem parte do seu dia?', hint: 'Selecione de 2 a 8 refeições.', kind: 'multi', min: 2, max: 8, options: options([['breakfast','Café da manhã'],['morning_snack','Lanche da manhã'],['pre_workout','Pré-treino'],['lunch','Almoço'],['afternoon_snack','Lanche da tarde'],['post_workout','Pós-treino'],['dinner','Jantar'],['supper','Ceia']]) },
  { key: 'diet_style', section: nutrition, question: 'Você segue algum estilo de alimentação?', kind: 'single', options: options([['classic','Como de tudo'],['vegetarian','Vegetariano'],['vegan','Vegano'],['pescatarian','Pescetariano'],['low_carb','Low carb']]) },
  { key: 'excluded_foods', section: nutrition, question: 'Quais alimentos você prefere deixar fora do plano?', hint: 'Marque os que não consome. Alergias vêm na próxima pergunta.', kind: 'multi', optional: true, options: options([['red_meat','Carne vermelha'],['pork','Carne suína'],['chicken','Frango'],['fish','Peixe'],['seafood','Frutos do mar'],['eggs','Ovos'],['dairy','Leite e derivados'],['gluten','Glúten'],['soy','Soja'],['nuts','Castanhas e amendoim']]) },
  { key: 'allergies', section: nutrition, question: 'Tem alguma alergia ou intolerância alimentar?', hint: 'Escreva todas as que o plano precisa respeitar.', kind: 'text', optional: true, max: 600, placeholder: 'Ex.: alergia a amendoim, intolerância à lactose' },
  { key: 'liked_foods', section: nutrition, question: 'O que você gosta de comer?', hint: 'Conte alguns alimentos que gostaria de ver nas refeições.', kind: 'text', optional: true, max: 600, placeholder: 'Ex.: arroz, feijão, banana, ovos' },
  { key: 'disliked_foods', section: nutrition, question: 'E o que você não gosta de comer?', kind: 'text', optional: true, max: 600, placeholder: 'Alimentos que prefere evitar' },
  { key: 'supplements', section: nutrition, question: 'Você já usa algum destes suplementos?', hint: 'Vamos registrar o que já faz parte da sua rotina.', kind: 'multi', optional: true, options: options([['whey','Whey protein'],['albumin','Albumina'],['creatine','Creatina'],['mass_gainer','Hipercalórico']]) },
  { key: 'budget', section: nutrition, question: 'Qual é seu orçamento mensal para alimentação?', kind: 'single', options: options([['ate_300','Até R$ 300'],['300_500','R$ 300 a R$ 500'],['500_800','R$ 500 a R$ 800'],['acima_800','Acima de R$ 800']]) },
  { key: 'ingredients', section: nutrition, question: 'Que ingredientes são fáceis de encontrar para você?', kind: 'single', options: options([['basicos','Os básicos do dia a dia'],['intermediarios','Tenho acesso a bastante variedade'],['sofisticados','Encontro até ingredientes especiais']]) },
  { key: 'cooks', section: nutrition, question: 'Você costuma preparar suas refeições?', kind: 'single', options: options([['sim_todas','Sim, preparo todas'],['as_vezes','Às vezes'],['raramente','Raramente'],['nao','Não costumo cozinhar']]) },
  { key: 'prep_time', section: nutrition, question: 'Quanto tempo você tem para preparar cada refeição?', kind: 'single', options: options([['menos_15','Menos de 15 minutos'],['15_30','15 a 30 minutos'],['30_60','30 minutos a 1 hora'],['mais_60','Mais de 1 hora']]) },
  { key: 'calories', section: nutrition, question: 'Já tem uma meta diária de calorias definida?', hint: 'Se recebeu uma orientação, informe aqui. Caso contrário, pode pular.', kind: 'number', optional: true, unit: 'kcal', min: 500, max: 10000, placeholder: 'Sua meta, se já tiver uma' },
];
export function ageFromBirthDate(value: string, today = new Date()): number | undefined {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!m) return;
  const [, d, mo, y] = m.map(Number), date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return;
  return today.getFullYear() - y - (today.getMonth() < mo - 1 || (today.getMonth() === mo - 1 && today.getDate() < d) ? 1 : 0);
}
export function answerError(step: Step, value: string | string[] | undefined): string {
  if (value !== undefined && ((step.kind === 'multi' && !Array.isArray(value)) || (step.kind !== 'multi' && typeof value !== 'string'))) return 'Resposta inválida.';
  const empty = value === undefined || value === '' || (Array.isArray(value) && !value.length);
  if (empty) return step.optional ? '' : 'Responda para continuar.';
  if (step.kind === 'multi') {
    if (!Array.isArray(value) || value.some(v => !step.options?.some(o => o.value === v)) || new Set(value).size !== value.length) return 'Escolha as opções disponíveis.';
    if (value.length < (step.min ?? 0)) return `Escolha pelo menos ${step.min} opções.`;
    if (step.max && value.length > step.max) return `Escolha até ${step.max} opções.`;
    return '';
  }
  if (typeof value !== 'string') return 'Resposta inválida.';
  if (step.kind === 'single') return step.options?.some(o => o.value === value) ? '' : 'Escolha uma opção.';
  if (step.kind === 'number') {
    const num = /^\d+(?:[.,]\d+)?$/.test(value) ? Number(value.replace(',', '.')) : NaN;
    return Number.isFinite(num) && num >= (step.min ?? 0) && num <= (step.max ?? Infinity) ? '' : `Informe um valor entre ${step.min} e ${step.max} ${step.unit}.`;
  }
  if (step.kind === 'date') {
    const age = ageFromBirthDate(value);
    return age !== undefined && age >= 10 && age <= 100 ? '' : 'Informe uma data válida (DD/MM/AAAA), entre 10 e 100 anos.';
  }
  if (step.kind === 'time') return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? '' : 'Use o formato HH:MM, como 18:30.';
  return value.trim().length > 0 && value.length <= (step.max ?? 600) ? '' : `Use até ${step.max ?? 600} caracteres.`;
}
export function displayAnswer(step: Step, value: string | string[] | undefined): string {
  if (!value || (Array.isArray(value) && !value.length)) return 'Não informado';
  const label = (v: string) => step.options?.find(o => o.value === v)?.label ?? v;
  return Array.isArray(value) ? value.map(label).join(' · ') : `${label(value)}${step.unit ? ` ${step.unit}` : ''}`;
}
export function firstUnanswered(answers: Answers): number {
  const i = onboardingSteps.findIndex(step => !(step.key in answers) || !!answerError(step, answers[step.key]));
  return i < 0 ? onboardingSteps.length : i;
}
export function cleanAnswers(value: unknown): Answers {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(onboardingSteps.flatMap(s => {
    const v = (value as Answers)[s.key];
    return (typeof v === 'string' || Array.isArray(v)) && !answerError(s, v) ? [[s.key, v]] : [];
  }));
}

export type OnboardingMessage = { id: string; step: Step; role: 'coach' | 'user'; text: string; index: number };
/** Each bubble keeps its identity and height when the next question is appended. */
export function onboardingMessages(answers: Answers, index: number): OnboardingMessage[] {
  return onboardingSteps.slice(0, index + 1).flatMap((step, i): OnboardingMessage[] => [
    { id: `${step.key}.question`, step, role: 'coach', text: step.question, index: i },
    ...(i < index ? [{ id: `${step.key}.answer`, step, role: 'user' as const, text: displayAnswer(step, answers[step.key]), index: i }] : []),
  ]).reverse();
}
export function usesKeyboard(step: Step | undefined): boolean {
  return !!step && step.kind !== 'single' && step.kind !== 'multi';
}
