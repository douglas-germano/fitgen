import type { Profile } from '@/types/api';

const date = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : null);

/** Human summary of the user's plan from `profile/me` (freemium aware). */
export function planSummary(profile?: Profile | null) {
  const premium = profile?.is_premium ?? profile?.has_access !== false;
  const until = date(profile?.subscription_expires_at);
  const status = profile?.subscription_status;
  if (!premium) {
    return { premium: false, title: 'Plano grátis', caption: 'Teste o Premium grátis por 7 dias', detail: 'Registrar treinos, refeições, água e medidas é grátis. O Premium libera a inteligência artificial do FitGen.' };
  }
  if (profile?.role === 'admin' && !until) {
    return { premium: true, title: 'FitGen Premium', caption: 'Acesso de administrador', detail: 'Contas de administrador têm todos os recursos liberados.' };
  }
  const renewal = status === 'canceled' ? `Acesso até ${until}` : status === 'past_due' ? 'Pagamento pendente' : until ? `Renova em ${until}` : 'Ativo';
  return { premium: true, title: 'FitGen Premium', caption: renewal, detail: '' };
}
