import { AppAlert } from '@/lib/feedback';
import { useQueryClient } from '@tanstack/react-query';
import { Check, ShoppingBasket } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Card, EmptyState, Page, PageSkeleton, ProgressBar, QueryError, Row, Text, TopBar } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';
import { useDietPlan } from '@/hooks/queries';
import { api, errorMessage } from '@/lib/api';
import type { ShoppingItem } from '@/types/api';

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
    <Page topBar={<TopBar title="Lista de compras" back />}>
      {list.length ? <>
        <Card>
          <Text variant="titleLg">{checked} de {list.length} itens</Text>
          <Text muted>Marque o que você já comprou e salve a lista.</Text>
          <ProgressBar value={checked / list.length * 100} />
          {total > 0 && <Text variant="titleSm">Custo estimado: {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Text>}
        </Card>
        <View style={{ gap: Spacing.three }}>
          {list.map((item, index) => (
            <Pressable key={index} disabled={busy} accessibilityRole="checkbox" accessibilityState={{ checked: !!item.checked }} accessibilityLabel={`${item.item}, ${item.quantidade}`}
              onPress={() => setList(list.map((x, i) => i === index ? { ...x, checked: !x.checked } : x))}>
              <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: item.checked ? Colors.volt : Colors.lineStrong, backgroundColor: item.checked ? Colors.volt : Colors.surface, alignItems: 'center', justifyContent: 'center' }}>{item.checked && <Check size={18} color={Colors.onVolt} />}</View>
                <View style={{ flex: 1, gap: 2 }}><Text variant="titleSm" style={item.checked && { textDecorationLine: 'line-through', color: Colors.inkMuted }}>{item.item}</Text><Text muted>{item.quantidade}</Text></View>
                {Number(item.preco_aprox) > 0 && <Text variant="label">{Number(item.preco_aprox).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Text>}
              </Card>
            </Pressable>
          ))}
        </View>
        <Row><Button size="lg" title="Salvar lista" onPress={save} loading={busy} style={{ flex: 1 }} /></Row>
      </> : <EmptyState icon={ShoppingBasket} message="Seu plano ainda não tem uma lista de compras." />}
    </Page>
  );
}
