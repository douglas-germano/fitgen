import { ClubVisibility } from '@/components/club-visibility';
import { GroupPhotoPicker } from '@/components/group-photo';
import { router } from 'expo-router';
import { useState } from 'react';
import { Button, Input, Page, Text, TopBar } from '@/components/ui';
import { useCreateGroup } from '@/hooks/community';
import { errorMessage } from '@/lib/api';
import { AppAlert } from '@/lib/feedback';
export default function CreateGroup() {
  const [name, setName] = useState(''); const [description, setDescription] = useState(''); const create = useCreateGroup(); const [isPublic, setIsPublic] = useState(false); const [imageUri, setImageUri] = useState<string | null>(null);
  return <Page topBar={<TopBar title="Criar grupo" back />}>
    <Text muted>Até 20 pessoas para acompanhar os treinos e se incentivar.</Text>
    <GroupPhotoPicker name={name} uri={imageUri} onPick={setImageUri} onRemove={() => setImageUri(null)} busy={create.isPending} />
    <Input label="Nome do grupo" value={name} onChangeText={setName} maxLength={60} />
    <Input label="Descrição (opcional)" value={description} onChangeText={setDescription} maxLength={280} multiline />
    <ClubVisibility isPublic={isPublic} onChange={setIsPublic} />
    <Button title="Criar grupo" disabled={!name.trim()} loading={create.isPending} onPress={() => create.mutate({ name: name.trim(), description, imageUri, is_public: isPublic }, { onSuccess: g => router.replace(`/community/group/${g.id}`), onError: e => AppAlert.alert('Erro ao criar grupo', errorMessage(e)) })} />
  </Page>;
}
