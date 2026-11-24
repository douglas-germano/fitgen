import { AppAlert } from '@/lib/feedback';
import { useQueryClient } from '@tanstack/react-query';
import { Check, ShoppingBasket } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { BackBar, Group, GroupRow, HeaderCard, SCREEN_COLUMN } from '@/components/grouped';
import { Button, Page, PageSkeleton, ProgressBar, QueryError, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';
import { useDietPlan } from '@/hooks/queries';
import { api, errorMessage } from '@/lib/api';
import type { ShoppingItem } from '@/types/api';

const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ShoppingListScreen() {
  const query = useDietPlan();
  if (query.isLoading) return <PageSkeleton title="Lista de compras" back tab={false} />;
  if (query.error) return <QueryError title="Lista de compras" back error={query.error} onRetry={query.refetch} />;
  return <ShoppingList key={`${query.data?.id}-${query.dataUpdatedAt}`} items={query.data?.shopping_list ?? []} />;
}

function ShoppingList({ items }: { items: ShoppingItem[] }) {
  const Colors = useColors();
  const qc = useQueryClient();
  const [list, setList] = useState(items);
  const [busy, setBusy] = useState(false);
  const checked = list.filter((item) => item.checked).length;
  const total = list.reduce((sum, item) => sum + (Number(item.preco_aprox) || 0), 0);
  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api('/diet/shopping-list', { method: 'PUT', body: { shopping_list: list } });
      await qc.invalidateQueries({ queryKey: ['diet-plan'] });
      AppAlert.alert('Lista salva', 'Os itens marcados ficam guardados no seu plano.');
    } catch (error) { AppAlert.alert('Erro ao salvar lista', errorMessage(error)); }
    finally { setBusy(false); }
  };
  return (
    <Page topBar={<BackBar />} contentStyle={SCREEN_COLUMN}
      footer={list.length ? <Button size="lg" title="Salvar lista" onPress={save} loading={busy} /> : undefined}>
      {list.length ? <>
        <HeaderCard title={`${checked} de ${list.length} itens`} value={total > 0 ? `≈ ${brl(total)}` : null}>
          <View style={{ paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, gap: Spacing.three }}>
            <ProgressBar value={checked / list.length * 100} />
            <Text muted style={{ fontSize: 13 }}>Marque o que você já comprou e salve a lista.</Text>
          </View>
        </HeaderCard>
        <Group title="Itens">
          {list.map((item, index) => (
            <GroupRow key={index}
              leading={
                <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: item.checked ? Colors.volt : Colors.lineStrong, backgroundColor: item.checked ? Colors.volt : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {item.checked && <Check size={15} strokeWidth={3} color={Colors.onVolt} />}
                </View>
              }
              title={item.item} caption={item.quantidade}
              value={Number(item.preco_aprox) > 0 ? brl(Number(item.preco_aprox)) : null}
              chevron={false}
              accessibilityLabel={`${item.item}, ${item.quantidade}${item.checked ? ', comprado' : ''}`}
              onPress={busy ? undefined : () => setList(list.map((x, i) => i === index ? { ...x, checked: !x.checked } : x))} />
          ))}
        </Group>
      </> : (
        <Group>
          <GroupRow icon={ShoppingBasket} title="Seu plano ainda não tem uma lista de compras." />
        </Group>
      )}
    </Page>
  );
}
