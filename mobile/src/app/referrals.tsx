import { Copy } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Platform, Share } from 'react-native';

import { Button, Card, Page, Text, TopBar } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';

type Program = { code: string; enabled: boolean; signups: number; qualified: number };
type Friends = Program & { progress: number; earned_days: number; starts_at: string | null; ends_at: string | null };
type Partner = Program & {
  pages: number;
  commissions: { id: string; amount: string; currency: string; status: string }[];
};

const labels: Record<string, string> = {
  pending: 'Estimativa pendente de conferência', approved: 'Aprovada', paid: 'Paga', void: 'Anulada', reversed: 'Estornada',
};

function Invite({ code, url, program }: { code: string; url: string; program: string }) {
  const [error, setError] = useState('');
  const [copiedUrl, setCopiedUrl] = useState('');

  const copyLink = async () => {
    setError('');
    setCopiedUrl('');
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
    } catch {
      setError('Não foi possível copiar. Selecione o link acima e copie manualmente.');
    }
  };
  return (
    <>
      <Text selectable>Código {code}</Text>
      <Text selectable>{url}</Text>
      {Platform.OS === 'web' ? (
        <>
          <Button title="Copiar link" accessibilityLabel={`Copiar link do ${program}`} icon={Copy} variant="soft" onPress={copyLink} />
          {copiedUrl === url && <Text muted variant="caption" accessibilityLiveRegion="polite">Link copiado.</Text>}
        </>
      ) : (
        <Button title="Compartilhar convite" onPress={async () => {
          try {
            await Share.share({ message: `Use o código ${code} para entrar no FitGen. ${url}` });
          } catch (failure) {
            setError(errorMessage(failure));
          }
        }} />
      )}
      {!!error && <Text accessibilityRole="alert">{error}</Text>}
    </>
  );
}

export default function ReferralsScreen() {
  const [page, setPage] = useState(1);
  const friends = useQuery({
    queryKey: ['referrals', 'friends'],
    queryFn: () => api<Friends>('/referrals/friends', { method: 'POST' }),
  });
  const partner = useQuery({
    queryKey: ['referrals', 'partner', page],
    queryFn: async () => {
      try {
        return await api<Partner>(`/referrals/partner?page=${page}`);
      } catch (failure) {
        if ((failure as { status?: number }).status === 404) return null;
        throw failure;
      }
    },
  });
  return (
    <Page topBar={<TopBar title="Indicações" back />}>
      <Card>
        <Text variant="titleMd">Indique e Ganhe</Text>
        <Text muted>A cada 3 amigos que se cadastrarem pelo seu convite e pagarem pela primeira vez, você ganha 30 dias de Premium. Os dias acumulam.</Text>
        {friends.isPending && <Text muted>Carregando convite…</Text>}
        {friends.isError && <Button title="Tentar novamente" onPress={() => { void friends.refetch(); }} />}
        {friends.data && (
          <>
            <Text>{friends.data.progress} de 3 amigos para o próximo bônus</Text>
            <Text>{friends.data.earned_days} dias Premium conquistados</Text>
            {friends.data.ends_at && new Date(friends.data.ends_at) > new Date() &&
              <Text muted>Bônus disponível até {new Date(friends.data.ends_at).toLocaleDateString('pt-BR')}.</Text>}
            <Invite program="Indique e Ganhe" code={friends.data.code} url={`https://web.fitgen.pro/register?ref=${friends.data.code}`} />
          </>
        )}
      </Card>
      {partner.isError && <Button title="Recarregar dados de parceiro" onPress={() => { void partner.refetch(); }} />}
      {partner.data && (
        <Card>
          <Text variant="titleMd">FitGen Parceiros</Text>
          <Text muted>30% do valor líquido recebido em cada pagamento da assinatura indicada.</Text>
          <Text>{partner.data.signups} cadastros · {partner.data.qualified} assinantes com pagamento</Text>
          {partner.data.enabled
            ? <Invite program="FitGen Parceiros" code={partner.data.code} url={`https://fitgen.pro/assinar?ref=${partner.data.code}`} />
            : <Text muted>Convite desativado.</Text>}
          {partner.data.commissions.map((row) => (
            <Text key={row.id}>
              {Number(row.amount).toLocaleString('pt-BR', { style: 'currency', currency: row.currency })} · {labels[row.status] ?? row.status}
            </Text>
          ))}
          {page > 1 && <Button title="Página anterior" onPress={() => setPage(page - 1)} />}
          {page < partner.data.pages && <Button title="Próxima página" onPress={() => setPage(page + 1)} />}
        </Card>
      )}
    </Page>
  );
}
