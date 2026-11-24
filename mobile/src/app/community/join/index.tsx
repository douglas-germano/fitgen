import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { GroupAvatar } from '@/components/group-photo';
import { BackBar, HeaderCard, MediaRow, SCREEN_COLUMN } from '@/components/grouped';
import { Button, Input, Page, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useGroupPreview, useJoinGroup } from '@/hooks/community';
import { normalizeCode } from '@/lib/community';
import { errorMessage } from '@/lib/api';
import { AppAlert } from '@/lib/feedback';
export default function JoinGroup() {
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(normalizeCode(params.code ?? ''));
  const [previewCode, setPreviewCode] = useState(params.code);
  const preview = useGroupPreview(previewCode); const join = useJoinGroup();
  const p = preview.data;
  return <Page topBar={<BackBar />} contentStyle={SCREEN_COLUMN}>
    <View style={{ gap: 2, paddingHorizontal: Spacing.two }}>
      <Text accessibilityRole="header" style={{ fontSize: 24, lineHeight: 30, fontWeight: '700' }}>Entrar com código</Text>
      <Text muted style={{ fontSize: 13 }}>Use o código de convite que alguém do clube compartilhou com você.</Text>
    </View>
    <Input label="Código de convite" autoCapitalize="characters" value={code} onChangeText={v => { setCode(normalizeCode(v)); setPreviewCode(undefined); }} maxLength={12} />
    <Button size="lg" variant="soft" title="Ver clube" disabled={!code} loading={preview.isFetching} onPress={() => setPreviewCode(code)} />
    {preview.error && <Text muted style={{ paddingHorizontal: Spacing.two }}>{errorMessage(preview.error)}</Text>}
    {p && <HeaderCard title="Clube encontrado">
      <MediaRow leading={<GroupAvatar group={{ id: p.id, name: p.name }} size={44} />} title={p.name} captionLines={3}
        caption={[`${p.member_count} ${p.member_count === 1 ? 'pessoa' : 'pessoas'}`, p.description].filter(Boolean).join(' · ')} />
      <View style={{ paddingHorizontal: Spacing.four, paddingBottom: Spacing.four }}>
        <Button size="lg" title={p.is_member ? 'Abrir clube' : p.is_full ? 'Clube cheio' : 'Entrar no clube'} disabled={p.is_full && !p.is_member} loading={join.isPending}
          onPress={() => p.is_member ? router.replace(`/community/group/${p.id}`) : join.mutate(code, { onSuccess: g => router.replace(`/community/group/${g.id}`), onError: e => AppAlert.alert('Erro ao entrar', errorMessage(e)) })} />
      </View>
    </HeaderCard>}
  </Page>;
}
