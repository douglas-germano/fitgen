import { ClubVisibility } from '@/components/club-visibility';
import { GroupPhotoPicker } from '@/components/group-photo';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { BackBar, SCREEN_COLUMN } from '@/components/grouped';
import { Button, Input, Page, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useCreateGroup } from '@/hooks/community';
import { errorMessage } from '@/lib/api';
import { AppAlert } from '@/lib/feedback';
export default function CreateGroup() {
  const [name, setName] = useState(''); const [description, setDescription] = useState(''); const create = useCreateGroup(); const [isPublic, setIsPublic] = useState(false); const [imageUri, setImageUri] = useState<string | null>(null);
  return <Page topBar={<BackBar />} contentStyle={SCREEN_COLUMN}>
    <View style={{ gap: 2, paddingHorizontal: Spacing.two }}>
      <Text accessibilityRole="header" style={{ fontSize: 24, lineHeight: 30, fontWeight: '700' }}>Criar clube</Text>
      <Text muted style={{ fontSize: 13 }}>Reúna sua turma para acompanhar os treinos e se incentivar.</Text>
    </View>
    <GroupPhotoPicker name={name} uri={imageUri} onPick={setImageUri} onRemove={() => setImageUri(null)} busy={create.isPending} />
    <Input label="Nome do clube" value={name} onChangeText={setName} maxLength={60} />
    <Input label="Descrição (opcional)" value={description} onChangeText={setDescription} maxLength={280} multiline />
    <ClubVisibility isPublic={isPublic} onChange={setIsPublic} />
    <Button size="lg" title="Criar clube" disabled={!name.trim()} loading={create.isPending} onPress={() => create.mutate({ name: name.trim(), description, imageUri, is_public: isPublic }, { onSuccess: g => router.replace(`/community/group/${g.id}`), onError: e => AppAlert.alert('Erro ao criar grupo', errorMessage(e)) })} />
  </Page>;
}
