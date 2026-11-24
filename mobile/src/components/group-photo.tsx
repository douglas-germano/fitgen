import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Camera } from 'lucide-react-native';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Avatar, Text } from '@/components/ui';
import { imageUri, useGroupImage } from '@/hooks/community';
import { errorMessage } from '@/lib/api';
import { AppActionSheet, AppAlert } from '@/lib/feedback';
import { useColors } from '@/providers/theme';
import type { CommunityGroup } from '@/types/api';

type GroupIdentity = Pick<CommunityGroup, 'id' | 'name' | 'profile_picture'>;
export function GroupAvatar({ group, size = 48 }: { group: GroupIdentity; size?: number }) {
  const image = useGroupImage(group.id, group.profile_picture);
  const uri = imageUri(image.data);
  if (uri) return <Image source={{ uri }} cachePolicy={image.data?.url ? 'disk' : 'none'} contentFit="cover" style={{ width: size, height: size, borderRadius: size / 2 }} accessibilityLabel={`Foto do clube ${group.name}`} />;
  return <Avatar name={group.name} size={size} />;
}

/** Club photo you tap to change: camera badge on the corner, options in the app's action sheet. */
export function GroupPhotoPicker({ group, name, uri, onPick, onRemove, busy = false, size = 96 }: {
  group?: GroupIdentity;
  name: string;
  uri?: string | null;
  onPick: (uri: string) => void;
  onRemove?: () => void;
  busy?: boolean;
  size?: number;
}) {
  const Colors = useColors();
  const hasPhoto = !!(uri || group?.profile_picture);
  const pick = async (source: 'library' | 'camera') => {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) { AppAlert.alert('Permissão necessária', 'Autorize o acesso à câmera nas configurações do aparelho.'); return; }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible };
      const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets[0]) onPick(result.assets[0].uri);
    } catch (e) { AppAlert.alert('Não foi possível escolher a foto', errorMessage(e)); }
  };
  const openOptions = () => {
    const choices = ['Escolher da galeria', 'Tirar foto', ...(hasPhoto && onRemove ? ['Remover foto'] : []), 'Cancelar'];
    AppActionSheet.showActionSheetWithOptions({
      title: 'Foto do clube', options: choices, cancelButtonIndex: choices.length - 1,
      destructiveButtonIndex: hasPhoto && onRemove ? 2 : undefined,
    }, (i) => {
      if (i === 0) void pick('library');
      else if (i === 1) void pick('camera');
      else if (i === 2 && hasPhoto && onRemove) onRemove();
    });
  };
  const badge = Math.round(size * 0.34);
  return <View style={{ alignItems: 'center', gap: 8 }}>
    <Pressable onPress={busy ? undefined : openOptions} accessibilityRole="button"
      accessibilityLabel={hasPhoto ? 'Alterar foto do clube' : 'Adicionar foto do clube'} accessibilityState={{ busy }}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
      {uri ? <Image source={{ uri }} contentFit="cover" style={{ width: size, height: size, borderRadius: size / 2 }} accessibilityLabel="Foto escolhida para o clube" />
        : group ? <GroupAvatar group={group} size={size} /> : <Avatar name={name || 'Clube'} size={size} />}
      {busy && <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: size / 2, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#fff" />
      </View>}
      <View style={{ position: 'absolute', right: 0, bottom: 0, width: badge, height: badge, borderRadius: badge / 2, alignItems: 'center', justifyContent: 'center',
        backgroundColor: Colors.volt, borderWidth: 3, borderColor: Colors.surface }}>
        <Camera size={Math.round(badge * 0.5)} color={Colors.onVolt} strokeWidth={2.4} />
      </View>
    </Pressable>
    <Text muted style={{ fontSize: 13 }}>{busy ? 'Enviando foto…' : hasPhoto ? 'Toque para alterar' : 'Adicionar foto'}</Text>
  </View>;
}
