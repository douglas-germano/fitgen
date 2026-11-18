import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Camera } from 'lucide-react-native';
import { View } from 'react-native';
import { Avatar, Button } from '@/components/ui';
import { imageUri, useGroupImage } from '@/hooks/community';
import { errorMessage } from '@/lib/api';
import { AppAlert } from '@/lib/feedback';
import type { CommunityGroup } from '@/types/api';

type GroupIdentity = Pick<CommunityGroup, 'id' | 'name' | 'profile_picture'>;
export function GroupAvatar({ group, size = 48 }: { group: GroupIdentity; size?: number }) {
  const image = useGroupImage(group.id, group.profile_picture);
  const uri = imageUri(image.data);
  if (uri) return <Image source={{ uri }} cachePolicy={image.data?.url ? 'disk' : 'none'} contentFit="cover" style={{ width: size, height: size, borderRadius: size / 2 }} accessibilityLabel={`Foto do clube ${group.name}`} />;
  return <Avatar name={group.name} size={size} />;
}

export function GroupPhotoPicker({ group, name, uri, onPick, onRemove, busy = false }: {
  group?: GroupIdentity;
  name: string;
  uri?: string | null;
  onPick: (uri: string) => void;
  onRemove?: () => void;
  busy?: boolean;
}) {
  const choose = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible });
      if (!result.canceled && result.assets[0]) onPick(result.assets[0].uri);
    } catch (e) { AppAlert.alert('Não foi possível escolher a foto', errorMessage(e)); }
  };
  return <View style={{ alignItems: 'center', gap: 12 }}>
    {uri ? <Image source={{ uri }} contentFit="cover" style={{ width: 88, height: 88, borderRadius: 44 }} accessibilityLabel="Foto escolhida para o clube" /> : group ? <GroupAvatar group={group} size={88} /> : <Avatar name={name || 'Clube'} size={88} />}
    <Button title={uri || group?.profile_picture ? 'Alterar foto do clube' : 'Adicionar foto do clube'} icon={Camera} variant="soft" onPress={choose} loading={busy} />
    {(uri || group?.profile_picture) && onRemove && <Button title="Remover foto" size="sm" variant="soft" onPress={onRemove} disabled={busy} />}
  </View>;
}
