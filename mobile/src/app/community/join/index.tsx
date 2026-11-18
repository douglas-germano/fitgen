import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, Card, Input, Page, Text, TopBar } from '@/components/ui';
import { useGroupPreview, useJoinGroup } from '@/hooks/community';
import { normalizeCode } from '@/lib/community';
import { errorMessage } from '@/lib/api';
import { AppAlert } from '@/lib/feedback';
export default function JoinGroup() {
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(normalizeCode(params.code ?? ''));
  const [previewCode, setPreviewCode] = useState(params.code);
  const preview = useGroupPreview(previewCode); const join = useJoinGroup();
  return <Page topBar={<TopBar title="Entrar no grupo" back />}>
    <Input label="Código de convite" autoCapitalize="characters" value={code} onChangeText={v => { setCode(normalizeCode(v)); setPreviewCode(undefined); }} maxLength={12} />
    <Button title="Ver grupo" disabled={!code} loading={preview.isFetching} onPress={() => setPreviewCode(code)} />
    {preview.error && <Text>{errorMessage(preview.error)}</Text>}
    {preview.data && <Card><Text variant="titleSm">{preview.data.name}</Text><Text>{preview.data.description}</Text><Text muted>{preview.data.member_count}/20 pessoas</Text>
      <Button title={preview.data.is_member ? 'Abrir grupo' : preview.data.is_full ? 'Grupo cheio' : 'Entrar'} disabled={preview.data.is_full && !preview.data.is_member} loading={join.isPending} onPress={() => preview.data?.is_member ? router.replace(`/community/group/${preview.data.id}`) : join.mutate(code, { onSuccess: g => router.replace(`/community/group/${g.id}`), onError: e => AppAlert.alert('Erro ao entrar', errorMessage(e)) })} />
    </Card>}
  </Page>;
}
