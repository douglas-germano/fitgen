import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { SquarePen } from 'lucide-react-native';

import { ActionMenu, FAB_CLEARANCE, FloatingAddButton } from '@/components/action-menu';
import { CommunityFeed } from '@/components/community-feed';
import { Avatar, BellButton, Page, TopBar } from '@/components/ui';
import { Control, Spacing } from '@/constants/theme';
import { useProfile, useUnreadNotifications } from '@/hooks/queries';
import { useCommunityRefresh } from '@/hooks/use-community-refresh';
import { useState } from 'react';

/** Home: the public feed. The day summary lives on the Medidas tab. */
export default function HomeScreen() {
  const profile = useProfile();
  const { data: unread } = useUnreadNotifications();
  const { refreshing, refresh } = useCommunityRefresh();
  const [actionsOpen, setActionsOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Page
        tab
        topBar={<TopBar
          title="Feed"
          leading={<Pressable onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel="Perfil" hitSlop={6}>
            <Avatar name={profile.data?.name} uri={profile.data?.profile_picture} size={Control.lg} />
          </Pressable>}
          action={<BellButton size="lg" unread={unread?.length ?? 0} />} />}
        refreshing={refreshing}
        onRefresh={() => { profile.refetch(); void refresh(); }}
        contentStyle={{ paddingBottom: FAB_CLEARANCE, gap: Spacing.three }}>
        <CommunityFeed scope={{ scope: 'public' }} />
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
