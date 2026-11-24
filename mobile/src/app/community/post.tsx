import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, Globe, Images, Lock, Send, Users, X, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';

import { BackBar, GroupTitle, SCREEN_COLUMN } from '@/components/grouped';
import { Avatar, Button, Chip, IconButton, Input, Page, Row, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useCreatePost, useGroups } from '@/hooks/community';
import { useProfile } from '@/hooks/queries';
import { errorMessage } from '@/lib/api';
import { IMAGE_RATIOS, imageAspect } from '@/lib/community';
import { AppActionSheet, AppAlert } from '@/lib/feedback';
import { useColors } from '@/providers/theme';
import type { Audience, ImageRatio } from '@/types/api';

const MAX_TEXT = 1000;
/** The preview never gets taller than this, so a 9:16 photo doesn't push everything off screen. */
const PREVIEW_MAX_HEIGHT = 420;

const AUDIENCES: { value: Audience; icon: LucideIcon; title: string; caption: string }[] = [
  { value: 'network', icon: Users, title: 'Minha turma', caption: 'Amigos e pessoas dos seus clubes' },
  { value: 'group', icon: Lock, title: 'Um clube', caption: 'Só os membros do clube escolhido' },
  { value: 'public', icon: Globe, title: 'Público', caption: 'Qualquer pessoa no FitGen, inclusive no Explorar' },
];

export default function PostScreen() {
  const Colors = useColors();
  const window = useWindowDimensions();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const profile = useProfile();
  const groups = useGroups();
  const create = useCreatePost();

  const [audience, setAudience] = useState<Audience>(groupId ? 'group' : 'network');
  const [group, setGroup] = useState(groupId ?? '');
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [ratio, setRatio] = useState<ImageRatio>('4:5');
  const [picking, setPicking] = useState(false);

  const myGroups = groups.data ?? [];
  const gid = group || myGroups[0]?.id;
  const noGroups = audience === 'group' && !groups.isLoading && myGroups.length === 0;
  const canPublish = (!!text.trim() || !!image) && !(audience === 'group' && !gid);
  const picked = AUDIENCES.find((a) => a.value === audience)!;
  const audienceName = audience === 'group' ? (myGroups.find((g) => g.id === gid)?.name ?? 'clube') : picked.title.toLowerCase();

  const pick = async (source: 'camera' | 'library') => {
    if (picking) return;
    setPicking(true);
    try {
      const permission = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        AppAlert.alert(
          source === 'camera' ? 'Câmera bloqueada' : 'Galeria bloqueada',
          'Autorize o acesso nos ajustes do aparelho para escolher uma foto.',
        );
        return;
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        // Full quality here: the app crops and compresses once, right before sending.
        quality: 1,
        // iOS: hand over a JPEG instead of the original HEIC.
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      };
      const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets[0]) setImage(result.assets[0].uri);
    } catch (e) {
      AppAlert.alert('Não foi possível abrir a foto', errorMessage(e));
    } finally {
      setPicking(false);
    }
  };

  const choosePhoto = () =>
    AppActionSheet.showActionSheetWithOptions(
      { options: ['Tirar foto agora', 'Escolher da galeria', 'Cancelar'], cancelButtonIndex: 2 },
      (index) => (index === 0 ? pick('camera') : index === 1 ? pick('library') : undefined),
    );

  const publish = () =>
    create.mutate(
      { text: text.trim(), audience, groupId: audience === 'group' ? gid : undefined, imageUri: image, ratio },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
        onError: (e) => AppAlert.alert('Erro ao publicar', errorMessage(e)),
      },
    );

  // Preview box: full width, but capped in height; centred when the cap wins (9:16).
  const available = window.width - Spacing.five * 2;
  const aspect = imageAspect(ratio);
  const previewWidth = Math.min(available, PREVIEW_MAX_HEIGHT * aspect);

  return (
    <Page
      topBar={<BackBar />}
      contentStyle={{ ...SCREEN_COLUMN, gap: Spacing.five }}
      footer={
        <>
          <Text variant="caption" style={{ textAlign: 'center' }}>
            {canPublish ? `Será publicado para ${audienceName}` : 'Escreva algo ou adicione uma foto'}
          </Text>
          <Button size="lg" icon={Send} title="Publicar" disabled={!canPublish} loading={create.isPending} onPress={publish} />
        </>
      }>
      <Text accessibilityRole="header" style={{ fontSize: 24, lineHeight: 30, fontWeight: '700', paddingHorizontal: Spacing.two }}>Nova publicação</Text>
      {/* Author */}
      <Row style={{ gap: Spacing.three }}>
        <Avatar name={profile.data?.name} uri={profile.data?.profile_picture} size={44} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="titleSm" numberOfLines={1}>{profile.data?.name ?? 'Você'}</Text>
          <Row style={{ gap: 6 }}>
            <picked.icon size={13} color={Colors.inkMuted} />
            <Text variant="caption" numberOfLines={1}>{audience === 'group' ? `Clube ${audienceName}` : picked.title}</Text>
          </Row>
        </View>
      </Row>

      {/* Photo */}
      {image ? (
        <View style={{ gap: Spacing.three, alignItems: 'center' }}>
          <View style={{ width: previewWidth, aspectRatio: aspect, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: Colors.surfaceChip }}>
            <Image source={{ uri: image }} contentFit="cover" style={{ width: '100%', height: '100%' }} accessibilityLabel="Foto selecionada" />
            <Row style={{ position: 'absolute', top: Spacing.three, right: Spacing.three, gap: Spacing.two }}>
              <IconButton icon={Camera} label="Trocar foto" variant="surface" onPress={choosePhoto} loading={picking} />
              <IconButton icon={X} label="Remover foto" variant="surface" onPress={() => setImage(null)} />
            </Row>
          </View>
          <Row style={{ gap: Spacing.two }} accessibilityRole="tablist">
            {IMAGE_RATIOS.map((r) => (
              <Chip key={r.value} label={r.value === '4:5' ? 'Retrato 4:5' : 'Vertical 9:16'} selected={ratio === r.value} onPress={() => setRatio(r.value)} />
            ))}
          </Row>
          <Text variant="caption" style={{ textAlign: 'center' }}>A foto é recortada no centro para caber no formato.</Text>
        </View>
      ) : (
        <View
          style={{
            borderRadius: Radius.md,
            borderCurve: 'continuous',
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: Colors.lineStrong,
            backgroundColor: Colors.surfaceSunken,
            paddingVertical: Spacing.six,
            paddingHorizontal: Spacing.four,
            alignItems: 'center',
            gap: Spacing.four,
          }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.volt, alignItems: 'center', justifyContent: 'center' }}>
            <Camera size={26} color={Colors.onVolt} />
          </View>
          <View style={{ gap: 2, alignItems: 'center' }}>
            <Text variant="titleMd">Adicione uma foto</Text>
            <Text variant="caption" style={{ textAlign: 'center' }}>Tire agora ou escolha da galeria. É opcional.</Text>
          </View>
          <Row style={{ gap: Spacing.three, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button size="sm" icon={Camera} title="Tirar foto" onPress={() => pick('camera')} loading={picking} />
            <Button size="sm" variant="soft" icon={Images} title="Galeria" onPress={() => pick('library')} disabled={picking} />
          </Row>
        </View>
      )}

      {/* Caption */}
      <View style={{ gap: Spacing.two }}>
        <Input placeholder="Escreva uma legenda…" value={text} onChangeText={setText} maxLength={MAX_TEXT} multiline accessibilityLabel="Legenda" />
        {text.length > MAX_TEXT * 0.8 && (
          <Text variant="caption" style={{ textAlign: 'right', fontVariant: ['tabular-nums'] }}>{text.length}/{MAX_TEXT}</Text>
        )}
      </View>

      {/* Audience */}
      <View style={{ gap: Spacing.three }}>
        <GroupTitle title="Quem pode ver" />
        {AUDIENCES.map((a) => {
          const on = audience === a.value;
          return (
            <Pressable
              key={a.value}
              onPress={() => setAudience(a.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${a.title}. ${a.caption}`}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.three,
                padding: Spacing.four,
                borderRadius: Radius.md,
                borderCurve: 'continuous',
                borderWidth: 2,
                borderColor: on ? Colors.ink : 'transparent',
                backgroundColor: on ? Colors.voltSoft : pressed ? Colors.surfaceChip : Colors.surfaceSunken,
              })}>
              <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? Colors.volt : Colors.surfaceChip }}>
                <a.icon size={18} color={on ? Colors.onVolt : Colors.inkMuted} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="titleSm">{a.title}</Text>
                <Text variant="caption">{a.caption}</Text>
              </View>
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: on ? Colors.ink : Colors.lineStrong, alignItems: 'center', justifyContent: 'center' }}>
                {on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.ink }} />}
              </View>
            </Pressable>
          );
        })}

        {audience === 'group' && (
          noGroups ? (
            <Text variant="caption">Você ainda não participa de nenhum clube. Crie ou entre em um na aba Comunidade.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }} keyboardShouldPersistTaps="handled">
              {myGroups.map((g) => <Chip key={g.id} label={g.name} selected={g.id === gid} onPress={() => setGroup(g.id)} />)}
            </ScrollView>
          )
        )}
      </View>
    </Page>
  );
}
