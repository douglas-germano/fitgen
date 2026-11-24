import { AppAlert } from '@/lib/feedback';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Award, BadgeCheck, Bell, Camera, ChevronLeft, ChevronRight, CircleHelp, Dumbbell, FileText, HeartPulse, History, Info, KeyRound, Mail, MessagesSquare, Ruler, ShieldCheck, SunMoon, Target, User, Users, Utensils } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';

import { Avatar, Button, Dialog, IconButton, Input, LinkText, ListItem, Page, PageSkeleton, QueryError, Row, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme, useColors } from '@/providers/theme';
import { uploadableFile } from '@/lib/upload';
import type { Profile } from '@/types/api';
import { useConnectHealth, useGamificationProgress, useHealthEnabled, useProfile, useStreaks } from '@/hooks/queries';
import { healthProviderName, healthUnavailableReason, isHealthAvailable } from '@/lib/health';
import { useHealthSync } from '@/hooks/use-health-sync';
import { api, errorMessage } from '@/lib/api';
import { passwordError } from '@/lib/forms';
import { ProfileGroup, ProfileMedals, ProfileRow, ProfileTiles } from '@/components/profile-overview';
import { ChoiceField } from '@/components/choice-field';
import { useAuth } from '@/providers/auth';
import { planSummary } from '@/lib/plan';

const THEME_LABEL = { light: 'Claro', dark: 'Escuro', system: 'Sistema' } as const;

export default function ProfileScreen() {
  const Colors = useColors();
  const { signOut } = useAuth();
  const { preference, setPreference } = useAppTheme();
  const { data: profile, isLoading, error, refetch, isRefetching } = useProfile();
  const plan = planSummary(profile);
  const qc = useQueryClient();
  const progress = useGamificationProgress();
  const streaks = useStreaks();
  const [nameOpen, setNameOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const web = Platform.OS === 'web';
  const native = Platform.OS === 'ios' || Platform.OS === 'android';

  if (isLoading) return <PageSkeleton title="Perfil" back tab={false} />;
  if (error) return <QueryError title="Perfil" back error={error} onRetry={refetch} />;

  const changePhoto = async () => {
    if (uploading) return;
    setUploading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7,
        // iOS: hand over a JPEG instead of the original HEIC.
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (result.canceled || !result.assets[0]) return;
      const image = result.assets[0];
      const form = new FormData();
      // The server identifies the format from the bytes, not the file name.
      form.append('file', await uploadableFile(image.uri));
      const saved = await api<{ profile_picture: string }>('/profile/image', { method: 'POST', body: form });
      qc.setQueryData<Profile>(['profile'], old => old && { ...old, profile_picture: saved.profile_picture });
      void qc.invalidateQueries({ queryKey: ['profile'] });
    } catch (error) { AppAlert.alert('Erro ao atualizar foto', errorMessage(error)); }
    finally { setUploading(false); }
  };

  const level = progress.data?.level ?? profile?.level;
  const streak = streaks.data?.workout_streak ?? 0;
  const subtitle = [level ? `Nível ${level}` : null, streak ? `${streak} ${streak === 1 ? 'dia seguido' : 'dias seguidos'}` : null]
    .filter(Boolean).join(' · ') || profile?.email;

  const confirmSignOut = () =>
    AppAlert.alert('Sair da Conta', 'Deseja encerrar sua sessão atual?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: signOut },
    ]);
  const contactSupport = () =>
    Linking.openURL('mailto:suporte@fitgen.com').catch(() => AppAlert.alert('Contato', 'Envie sua mensagem para suporte@fitgen.com.'));

  return (
    <Page tab={false} topBar={
      <Row style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
        <IconButton icon={ChevronLeft} label="Voltar" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
      </Row>
    } refreshing={isRefetching} onRefresh={refetch}
      contentStyle={{ width: '100%', maxWidth: 480, alignSelf: 'center', gap: Spacing.four }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Editar perfil" onPress={() => setEditOpen(true)}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center', gap: Spacing.four, padding: Spacing.four,
          borderRadius: Radius.md + 4, borderCurve: 'continuous',
          backgroundColor: pressed ? Colors.surfaceChip : Colors.surfaceSunken,
        })}>
        <View style={{ padding: 2, borderRadius: 40, borderWidth: 2, borderColor: Colors.ink }}>
          <Avatar name={profile?.name} uri={profile?.profile_picture} size={56} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={{ fontSize: 19, lineHeight: 24, fontWeight: '600' }} numberOfLines={1}>{profile?.name}</Text>
          {subtitle ? <Text muted style={{ fontSize: 13 }} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        <ChevronRight size={18} color={Colors.inkMuted} />
      </Pressable>

      <ProfileTiles planTitle={plan.premium ? 'Premium' : 'Assinatura'} planCaption={plan.premium ? plan.caption : plan.title} />
      <ProfileMedals />

      <ProfileGroup title="Seus dados">
        <ProfileRow icon={Award} title="Minhas conquistas" onPress={() => router.push('/achievements')} />
        <ProfileRow icon={History} title="Minhas atividades" onPress={() => router.push('/workout/history')} />
        <ProfileRow icon={Dumbbell} title="Meus treinos" onPress={() => router.push('/(tabs)/workouts')} />
        <ProfileRow icon={Utensils} title="Plano alimentar" onPress={() => router.push('/diet-plan')} />
        <ProfileRow icon={Ruler} title="Medidas" onPress={() => router.push('/(tabs)/metrics')} />
        {!web && <ProfileRow icon={Target} title="Objetivos e dados físicos" onPress={() => router.push('/profile-edit')} />}
        {native && <HealthRow />}
      </ProfileGroup>

      <ProfileGroup title="Conta e preferências" nativeID="profile-settings">
        <ProfileRow icon={Mail} title="Email" value={profile?.email} />
        <ProfileRow icon={KeyRound} title="Senha" onPress={() => setPasswordOpen(true)} />
        <ProfileRow icon={Bell} title="Notificações" onPress={() => router.push('/notifications')} />
        <ProfileRow icon={SunMoon} title="Aparência" value={THEME_LABEL[preference]} onPress={() => setThemeOpen(true)} />
        <ProfileRow icon={BadgeCheck} title="Assinatura" value={plan.premium ? 'Premium' : plan.title} onPress={() => router.push('/paywall')} />
        <ProfileRow icon={Users} title="Indique e Ganhe" onPress={() => router.push('./referrals')} />
      </ProfileGroup>

      <ProfileGroup title="Outros">
        <ProfileRow icon={MessagesSquare} title="Configuração inicial" onPress={() => router.push('/onboarding')} />
        <ProfileRow icon={Users} title="Pessoas" onPress={() => router.push('/community/people')} />
        <ProfileRow icon={ShieldCheck} title="Gerenciamento de privacidade" onPress={() => router.push('/community/settings')} />
        <ProfileRow icon={FileText} title="Política de privacidade" onPress={() => router.push('/privacy')} />
        <ProfileRow icon={CircleHelp} title="Ajuda" onPress={contactSupport} />
        <ProfileRow icon={Info} title="Sobre" value={`Versão: ${Constants.expoConfig?.version ?? '—'}`} />
      </ProfileGroup>

      <View style={{ gap: Spacing.four, alignItems: 'center', paddingTop: Spacing.two }}>
        <Pressable accessibilityRole="button" onPress={confirmSignOut}
          style={({ pressed }) => ({
            alignSelf: 'stretch', minHeight: 52, alignItems: 'center', justifyContent: 'center',
            borderRadius: Radius.md + 4, borderCurve: 'continuous',
            backgroundColor: pressed ? Colors.surfaceChip : Colors.surfaceSunken,
          })}>
          <Text style={{ fontSize: 16, fontWeight: '600' }} color={Colors.danger}>Sair da conta</Text>
        </Pressable>
        <LinkText title="Excluir minha conta" style={{ color: Colors.inkMuted, fontSize: 14 }} onPress={() => router.push('/delete-account')} />
      </View>

      {editOpen && (
        <Dialog visible title="Editar perfil" onClose={() => setEditOpen(false)}>
          <ListItem icon={User} title="Alterar nome" caption={profile?.name} arrow onPress={() => { setEditOpen(false); setNameOpen(true); }} />
          <ListItem icon={Camera} title={uploading ? 'Enviando foto…' : 'Alterar foto'} arrow onPress={uploading ? undefined : () => { setEditOpen(false); void changePhoto(); }} />
          {!web && <ListItem icon={Target} title="Objetivos e dados físicos" arrow onPress={() => { setEditOpen(false); router.push('/profile-edit'); }} />}
        </Dialog>
      )}
      {themeOpen && (
        <Dialog visible title="Aparência" description="Em Sistema, o FitGen acompanha a aparência do dispositivo." onClose={() => setThemeOpen(false)}>
          <ChoiceField
            label="Tema do aplicativo"
            value={preference}
            options={[{ label: 'Claro', value: 'light' }, { label: 'Escuro', value: 'dark' }, { label: 'Sistema', value: 'system' }]}
            onChange={(next) => { void setPreference(next).catch(() => AppAlert.alert('Não foi possível salvar o tema', 'A aparência foi aplicada, mas não pôde ser salva neste dispositivo.')); }}
          />
        </Dialog>
      )}
      {nameOpen && <NameDialog current={profile?.name ?? ''} onClose={() => setNameOpen(false)} />}
      {passwordOpen && <PasswordDialog onClose={() => setPasswordOpen(false)} />}
    </Page>
  );
}

/** Apple Health / Health Connect on/off. Permissions per data type are managed by the OS (iOS Settings > Health, Android Health Connect). */
function HealthRow() {
  const available = isHealthAvailable();
  const provider = healthProviderName();
  const { data: enabled } = useHealthEnabled();
  const profile = useProfile();
  const { account } = useHealthSync(profile.data?.id);
  const connectedToAccount = enabled && account.data !== false;
  const toggle = useConnectHealth();

  const connect = async () => {
    try {
      await toggle.mutateAsync(true);
      AppAlert.alert(`${provider} conectado`, 'Treinos e pesos dos últimos 90 dias serão importados automaticamente para sua conta FitGen. Seus registros feitos no FitGen também serão enviados ao Saúde conforme as permissões.');
    } catch (e) {
      AppAlert.alert(`Não foi possível conectar ao ${provider}`, errorMessage(e));
    }
  };

  const manage = () =>
    AppAlert.alert(provider, Platform.OS === 'android' ? 'Para escolher quais dados o FitGen pode ler e gravar, abra o Health Connect > Permissões do app > FitGen.' : 'Para escolher quais dados o FitGen pode ler e gravar, abra Ajustes > Saúde > Acesso a Dados > FitGen.', [
      { text: 'Fechar', style: 'cancel' },
      { text: 'Revisar permissões', onPress: connect },
      { text: 'Desconectar', style: 'destructive', onPress: () => { void toggle.mutateAsync(false); } },
    ]);

  return (
    <ProfileRow
      icon={HeartPulse}
      title={provider}
      value={!available ? 'Indisponível' : connectedToAccount ? 'Conectado' : 'Conectar'}
      dot={available && !connectedToAccount}
      onPress={available && !toggle.isPending ? (connectedToAccount ? manage : connect) : !available ? () => AppAlert.alert(provider, healthUnavailableReason()) : undefined}
    />
  );
}

function NameDialog({ current, onClose }: { current: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(current);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await api('/profile/me', { method: 'PUT', body: { name: name.trim() } });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      onClose();
    } catch (e) {
      AppAlert.alert('Erro ao atualizar nome.', errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog visible onClose={onClose} title="Alterar Nome" description="Seu nome de exibição no app.">
      <Input label="Novo Nome" value={name} onChangeText={setName} autoFocus />
      <Row style={{ gap: Spacing.three }}>
        <Button title="Salvar" onPress={save} loading={loading} style={{ flex: 1 }} />
      </Row>
    </Dialog>
  );
}

function PasswordDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ old: '', next: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  // Accounts created with Google/Apple have no password yet: they set one without the "current" field.
  const account = useQuery({ queryKey: ['auth-me'], queryFn: () => api<{ has_password: boolean }>('/auth/me') });
  const hasPassword = account.data?.has_password ?? true;

  const save = async () => {
    const validation = passwordError(form.next);
    if ((hasPassword && !form.old) || validation) {
      AppAlert.alert(validation || 'Informe sua senha atual.');
      return;
    }
    if (form.next !== form.confirm) {
      AppAlert.alert('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      await api('/auth/change-password', {
        method: 'POST',
        recoverSession: false,
        body: { ...(hasPassword ? { old_password: form.old } : {}), new_password: form.next },
      });
      void account.refetch();
      AppAlert.alert(hasPassword ? 'Senha alterada com sucesso!' : 'Senha criada! Agora você também pode entrar com email e senha.');
      onClose();
    } catch (e) {
      AppAlert.alert('Erro ao alterar senha.', errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const field = { secureTextEntry: true, autoCapitalize: 'none' as const, autoCorrect: false };
  return (
    <Dialog
      visible
      onClose={onClose}
      title={hasPassword ? 'Alterar Senha' : 'Criar Senha'}
      description={hasPassword ? 'Altere sua senha de acesso.' : 'Você entra com Google ou Apple. Crie uma senha para também entrar com email.'}>
      {hasPassword && (
        <Input label="Senha Atual" {...field} textContentType="password" value={form.old} onChangeText={(old) => setForm({ ...form, old })} />
      )}
      <Input label="Nova Senha" {...field} textContentType="newPassword" value={form.next} onChangeText={(next) => setForm({ ...form, next })} />
      <Input label="Confirmar Nova Senha" {...field} textContentType="newPassword" value={form.confirm} onChangeText={(confirm) => setForm({ ...form, confirm })} />
      <Row style={{ gap: Spacing.three }}>
        <Button title="Salvar" onPress={save} loading={loading} style={{ flex: 1 }} />
      </Row>
    </Dialog>
  );
}
