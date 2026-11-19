import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { SquarePen } from 'lucide-react-native';

import { ActionMenu, FAB_CLEARANCE, FloatingAddButton } from '@/components/action-menu';
import { CommunityFeed } from '@/components/community-feed';
import { Avatar, BellButton, Page, Row, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useProfile, useUnreadNotifications } from '@/hooks/queries';
import { useCommunityRefresh } from '@/hooks/use-community-refresh';
import { useState } from 'react';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia,' : h < 18 ? 'Boa tarde,' : 'Boa noite,';
}

/** Home: greeting + the public "Explorar" feed. The day summary lives on the Medidas tab. */
export default function HomeScreen() {
  const profile = useProfile();
  const { data: unread } = useUnreadNotifications();
  const { refreshing, refresh } = useCommunityRefresh();
  const [actionsOpen, setActionsOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Page
        tab
        refreshing={refreshing}
        onRefresh={() => { profile.refetch(); void refresh(); }}
        contentStyle={{ paddingBottom: FAB_CLEARANCE }}>
        <Row style={{ gap: Spacing.three }}>
          <Pressable onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel="Perfil">
            <Avatar name={profile.data?.name} uri={profile.data?.profile_picture} />
          </Pressable>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="label" muted style={{ fontWeight: '400' }}>{greeting()}</Text>
            <Text variant="titleLg" numberOfLines={1}>{profile.data?.name || 'Atleta'}</Text>
          </View>
          <BellButton size="lg" unread={unread?.length ?? 0} />
        </Row>

        <View style={{ gap: Spacing.three }}>
          <Text variant="titleMd">Explorar</Text>
          <CommunityFeed scope={{ scope: 'public' }} />
        </View>
      </Page>
      <FloatingAddButton label="Nova publicação" hint="Abre as opções de publicação" onPress={() => setActionsOpen(true)} />
      <ActionMenu
        visible={actionsOpen}
        title="O que você quer fazer?"
        onClose={() => setActionsOpen(false)}
        items={[
          { key: 'post', icon: SquarePen, tone: 'volt', title: 'Nova publicação', caption: 'Compartilhe um momento com sua turma', onPress: () => router.push('/community/post') },
        ]}
      />
    </View>
  );
}
