import { AppAlert } from '@/lib/feedback';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Bell, Camera, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, FileText, HeartPulse, Link2, Mail, Settings, ShieldCheck, Sparkles, Target, User, Users, type LucideIcon } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';

import {
  Avatar,
  Badge,
  Button,
  Card,
  Dialog,
  IconButton,
  Input,
  LinkText,
  ListItem,
  Page,
  PageSkeleton,
  QueryError,
  Row,
  SectionHeader,
  Text,
  TopBar,
} from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme, useColors } from '@/providers/theme';
import { uploadableFile } from '@/lib/upload';
import type { Profile } from '@/types/api';
import { useConnectHealth, useGamificationProgress, useHealthEnabled, useProfile, useStreaks } from '@/hooks/queries';
import { healthProviderName, healthUnavailableReason, isHealthAvailable } from '@/lib/health';
import { useHealthSync } from '@/hooks/use-health-sync';
import { api, errorMessage } from '@/lib/api';
import { passwordError } from '@/lib/forms';
import { ProfileOverview } from '@/components/profile-overview';
import { ChoiceField } from '@/components/choice-field';
import { useAuth } from '@/providers/auth';
import { planSummary } from '@/lib/plan';

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
  const [uploading, setUploading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const web = Platform.OS === 'web';

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

  const confirmSignOut = () =>
    AppAlert.alert('Sair da Conta', 'Deseja encerrar sua sessão atual?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: signOut },
    ]);

  const accountPreferences = (
    <View style={{ gap: Spacing.three }}>
      <SectionHeader title="Aparência" />
      <Card>
        <ChoiceField
          label="Tema do aplicativo"
          value={preference}
          options={[{ label: 'Claro', value: 'light' }, { label: 'Escuro', value: 'dark' }, { label: 'Sistema', value: 'system' }]}
          onChange={(next) => { void setPreference(next).catch(() => AppAlert.alert('Não foi possível salvar o tema', 'A aparência foi aplicada, mas não pôde ser salva neste dispositivo.')); }}
        />
        <Text muted>Em Sistema, o FitGen acompanha a aparência do dispositivo.</Text>
      </Card>
      <SectionHeader title="Assinatura" />
      <ListItem icon={Sparkles} iconTone={plan.premium ? 'volt' : 'chip'} title={plan.premium ? 'FitGen Premium' : 'Ver assinatura'} caption={plan.premium ? plan.caption : `${plan.title} · ${plan.caption}`} arrow onPress={() => router.push('/paywall')} />
      <SectionHeader title={web ? 'Conta' : 'Configurações da Conta:'} />
      <ListItem icon={Target} title="Minha configuração inicial" caption="Revisar a conversa sobre treino e alimentação" arrow onPress={() => router.push('/onboarding')} />
      {!web && <ListItem icon={Target} title="Objetivos e dados físicos" caption="Rotina, medidas e preferências de treino" arrow onPress={() => router.push('/profile-edit')} />}
      {!web && <ListItem icon={User} iconTone="chip" title="Alterar Nome" caption="Seu nome de exibição" arrow onPress={() => setNameOpen(true)} />}
      <ListItem icon={Mail} iconTone="chip" title="Email" caption={web ? profile?.email : "O email não pode ser alterado"} />
      <ListItem icon={Link2} iconTone="chip" title="Alterar Senha" caption="Altere sua senha de acesso" arrow onPress={() => setPasswordOpen(true)} />
      <ListItem icon={Bell} iconTone="chip" title="Notificações" caption="Lembretes de treino, água e metas" arrow onPress={() => router.push('/notifications')} />
    </View>
  );
  const communityPeople = (
    <ListItem icon={Users} iconTone="chip" title="Pessoas" caption="Buscar pessoas e gerenciar quem você segue" arrow onPress={() => router.push('/community/people')} />
  );
  const communityPrivacy = (
    <ListItem icon={ShieldCheck} iconTone="chip" title="Privacidade da comunidade" caption="Compartilhamento e pessoas bloqueadas" arrow onPress={() => router.push('/community/settings')} />
  );
  const support = (
    <Card style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.five }}>
      <Text muted style={{ flex: 1 }}>
        Precisa de ajuda? Entre em contato conosco.
      </Text>
      <Button size="sm" variant="soft" title="Enviar Email" onPress={() => Linking.openURL('mailto:suporte@fitgen.com').catch(() => AppAlert.alert('Contato', 'Envie sua mensagem para suporte@fitgen.com.'))} />
    </Card>
  );
  const privacyPolicy = (
    <ListItem
      icon={FileText}
      iconTone="chip"
      title="Política de Privacidade"
      arrow
      onPress={() => router.push('/privacy')}
    />
  );
  const accountActions = (
    <View style={{ gap: Spacing.four, alignItems: 'center', paddingTop: Spacing.four }}>
      <Button variant="inverse" size="lg" title="Sair da Conta" onPress={confirmSignOut} style={{ alignSelf: 'stretch' }} />
      <LinkText
        title="Excluir Minha Conta"
        style={{ color: Colors.inkMuted, fontSize: 14 }}
        onPress={() => router.push('/delete-account')}
      />
      <Text variant="caption">FitGen v{Constants.expoConfig?.version}</Text>
    </View>
  );

  return (
    <Page tab={false} topBar={web ? (
      <Row style={{ width: '100%', maxWidth: 424, alignSelf: 'center' }}>
        <IconButton icon={ChevronLeft} label="Voltar" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
        <Text variant="titleLg" accessibilityRole="header" style={{ flex: 1, fontSize: 27, lineHeight: 33 }}>Perfil</Text>
        <IconButton icon={Settings} label="Ir às configurações"
          onPress={() => document.getElementById('profile-settings')?.scrollIntoView({ block: 'center' })} />
      </Row>
    ) : <TopBar title="Perfil" back />} refreshing={isRefetching} onRefresh={refetch}
      contentStyle={web ? { width: '100%', maxWidth: 424, alignSelf: 'center', gap: Spacing.five } : undefined}>
      {web ? (
        <>
          <Pressable accessibilityRole="button" accessibilityLabel="Editar perfil" onPress={() => setEditOpen(true)}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingBottom: Spacing.three,
              borderBottomWidth: 1, borderColor: Colors.line, opacity: pressed ? 0.72 : 1,
            })}>
            <Avatar name={profile?.name} uri={profile?.profile_picture} size={52} />
            <View style={{ flex: 1 }}>
              <Text variant="titleMd">{profile?.name}</Text>
              <Text variant="caption">Editar perfil</Text>
            </View>
            <ChevronRight size={16} color={Colors.inkMuted} />
          </Pressable>
          <ProfileOverview />
          <View nativeID="profile-settings" style={{ gap: Spacing.two }}>
            <SectionHeader title="Configurações" />
            <View style={{ borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.line, backgroundColor: Colors.surfaceSunken }}>
              <ProfileSettingsGroup title="Conta e preferências" icon={User}>
                {accountPreferences}
                {communityPeople}
                {accountActions}
              </ProfileSettingsGroup>
              <ProfileSettingsGroup title="Integrações" icon={Link2}>
                <Text muted>Conecte o Apple Saúde ou o Health Connect pelo aplicativo móvel do FitGen.</Text>
              </ProfileSettingsGroup>
              <ProfileSettingsGroup title="Privacidade" icon={ShieldCheck}>
                {communityPrivacy}
                {privacyPolicy}
              </ProfileSettingsGroup>
              <ProfileSettingsGroup title="Ajuda e suporte" icon={CircleHelp} last>
                {support}
              </ProfileSettingsGroup>
            </View>
          </View>
          {editOpen && (
            <Dialog visible title="Editar perfil" onClose={() => setEditOpen(false)}>
              <ListItem icon={User} title="Alterar nome" caption={profile?.name} arrow onPress={() => { setEditOpen(false); setNameOpen(true); }} />
              <ListItem icon={Camera} title={uploading ? 'Enviando foto…' : 'Alterar foto'} arrow onPress={uploading ? undefined : changePhoto} />
              <ListItem icon={Target} title="Objetivos e dados físicos" arrow onPress={() => { setEditOpen(false); router.push('/profile-edit'); }} />
            </Dialog>
          )}
        </>
      ) : (
        <>
          <Card style={{ alignItems: 'center', paddingVertical: Spacing.six, gap: Spacing.two }}>
            <Avatar name={profile?.name} uri={profile?.profile_picture} size={80} />
            <Text variant="titleLg" style={{ marginTop: Spacing.two, textAlign: 'center' }}>
              {profile?.name}
            </Text>
            <Text muted>{profile?.email}</Text>
            <Row style={{ marginTop: Spacing.one }}>
              {level ? <Badge label={`Nível ${level}`} /> : null}
              <Badge tone="chip" label={`${streak} ${streak === 1 ? 'dia seguido' : 'dias seguidos'}`} />
            </Row>
            <Button size="sm" variant="soft" icon={Camera} title="Alterar foto" loading={uploading} onPress={changePhoto} />
          </Card>
          {accountPreferences}
          <View style={{ gap: Spacing.three }}>
            <SectionHeader title="Comunidade" />
            {communityPeople}
            {communityPrivacy}
          </View>
          {(Platform.OS === 'ios' || Platform.OS === 'android') && <View style={{ gap: Spacing.three }}>
            <SectionHeader title="Integrações:" />
            <HealthItem />
          </View>}
          <View style={{ gap: Spacing.three }}>
            <SectionHeader title="Ajuda e Suporte:" />
            {support}
            {privacyPolicy}
          </View>
          {accountActions}
        </>
      )}

      {nameOpen && <NameDialog current={profile?.name ?? ''} onClose={() => setNameOpen(false)} />}
      {passwordOpen && <PasswordDialog onClose={() => setPasswordOpen(false)} />}
    </Page>
  );
}

function ProfileSettingsGroup({ title, icon: Icon, last, children }: {
  title: string;
  icon: LucideIcon;
  last?: boolean;
  children: ReactNode;
}) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ borderBottomWidth: last ? 0 : 1, borderColor: colors.line }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 48, paddingHorizontal: Spacing.three,
          opacity: pressed ? 0.72 : 1,
        })}>
        <Icon size={18} color={colors.inkMuted} />
        <Text variant="titleSm" style={{ flex: 1 }}>{title}</Text>
        {open ? <ChevronDown size={15} color={colors.inkMuted} /> : <ChevronRight size={15} color={colors.inkMuted} />}
      </Pressable>
      {open && <View style={{ gap: Spacing.three, paddingHorizontal: Spacing.three, paddingBottom: Spacing.three }}>{children}</View>}
    </View>
  );
}

/** Apple Health / Health Connect on/off. Permissions per data type are managed by the OS (iOS Settings > Health, Android Health Connect). */
function HealthItem() {
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
    <ListItem
      icon={HeartPulse}
      title={provider}
      caption={!available ? healthUnavailableReason() : enabled ? 'Sincronização automática de treinos e peso' : 'Conecte para importar treinos e pesos automaticamente para sua conta'}
      right={available ? <Badge tone={connectedToAccount ? 'volt' : 'chip'} label={connectedToAccount ? 'Conectado' : 'Conectar'} /> : undefined}
      onPress={available && !toggle.isPending ? (connectedToAccount ? manage : connect) : undefined}
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
        <Button variant="soft" title="Cancelar" onPress={onClose} style={{ flex: 1 }} />
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
        <Button variant="soft" title="Cancelar" onPress={onClose} style={{ flex: 1 }} />
        <Button title="Salvar" onPress={save} loading={loading} style={{ flex: 1 }} />
      </Row>
    </Dialog>
  );
}
