import { AppAlert } from '@/lib/feedback';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Bell, Camera, FileText, HeartPulse, Link2, Mail, ShieldCheck, Sparkles, Target, User, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Platform, View } from 'react-native';

import {
  Avatar,
  Badge,
  Button,
  Card,
  Dialog,
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
import { Spacing } from '@/constants/theme';
import { useAppTheme, useColors } from '@/providers/theme';
import { uploadableFile } from '@/lib/upload';
import type { Profile } from '@/types/api';
import { useConnectHealth, useGamificationProgress, useHealthEnabled, useProfile, useStreaks } from '@/hooks/queries';
import { healthUnavailableReason, isHealthAvailable } from '@/lib/health';
import { HealthSyncStatus } from '@/components/health-week';
import { useHealthSync } from '@/hooks/use-health-sync';
import { api, errorMessage } from '@/lib/api';
import { passwordError } from '@/lib/forms';
import { ChoiceField } from '@/components/choice-field';
import { useAuth } from '@/providers/auth';
import { purchasesEnabled } from '@/lib/purchases';

export default function ProfileScreen() {
  const Colors = useColors();
  const { signOut } = useAuth();
  const { preference, setPreference } = useAppTheme();
  const { data: profile, isLoading, error, refetch, isRefetching } = useProfile();
  const qc = useQueryClient();
  const progress = useGamificationProgress();
  const streaks = useStreaks();
  const [nameOpen, setNameOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  return (
    <Page tab={false} topBar={<TopBar title="Perfil" back />} refreshing={isRefetching} onRefresh={refetch}>
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
        <SectionHeader title="Configurações da Conta:" />
        <ListItem icon={Target} title="Minha configuração inicial" caption="Revisar a conversa sobre treino e alimentação" arrow onPress={() => router.push('/onboarding')} />
        <ListItem icon={Target} title="Objetivos e dados físicos" caption="Rotina, medidas e preferências de treino" arrow onPress={() => router.push('/profile-edit')} />
        <ListItem icon={User} iconTone="chip" title="Alterar Nome" caption="Seu nome de exibição" arrow onPress={() => setNameOpen(true)} />
        <ListItem icon={Mail} iconTone="chip" title="Email" caption="O email não pode ser alterado" />
        {purchasesEnabled && <ListItem icon={Sparkles} title="Assinatura" caption="Planos, teste grátis e restaurar compras" arrow onPress={() => router.push('/paywall')} />}
        <ListItem icon={Link2} iconTone="chip" title="Alterar Senha" caption="Altere sua senha de acesso" arrow onPress={() => setPasswordOpen(true)} />
        <ListItem icon={Bell} iconTone="chip" title="Notificações" caption="Lembretes de treino, água e metas" arrow onPress={() => router.push('/notifications')} />
      </View>

      <View style={{ gap: Spacing.three }}>
        <SectionHeader title="Comunidade" />
        <ListItem icon={Users} iconTone="chip" title="Pessoas" caption="Buscar pessoas e gerenciar quem você segue" arrow onPress={() => router.push('/community/people')} />
        <ListItem icon={ShieldCheck} iconTone="chip" title="Privacidade da comunidade" caption="Compartilhamento e pessoas bloqueadas" arrow onPress={() => router.push('/community/settings')} />
      </View>

      {Platform.OS === 'ios' && <View style={{ gap: Spacing.three }}>
        <SectionHeader title="Integrações:" />
        <AppleHealthItem />
        <HealthSyncStatus />
      </View>}

      <View style={{ gap: Spacing.three }}>
        <SectionHeader title="Ajuda e Suporte:" />
        <Card style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.five }}>
          <Text muted style={{ flex: 1 }}>
            Precisa de ajuda? Entre em contato conosco.
          </Text>
          <Button size="sm" variant="soft" title="Enviar Email" onPress={() => Linking.openURL('mailto:suporte@fitgen.com').catch(() => AppAlert.alert('Contato', 'Envie sua mensagem para suporte@fitgen.com.'))} />
        </Card>
        <ListItem
          icon={FileText}
          iconTone="chip"
          title="Política de Privacidade"
          arrow
          onPress={() => router.push('/privacy')}
        />
      </View>

      <View style={{ gap: Spacing.four, alignItems: 'center', paddingTop: Spacing.four }}>
        <Button variant="inverse" size="lg" title="Sair da Conta" onPress={confirmSignOut} style={{ alignSelf: 'stretch' }} />
        <LinkText
          title="Excluir Minha Conta"
          style={{ color: Colors.inkMuted, fontSize: 14 }}
          onPress={() => router.push('/delete-account')}
        />
        <Text variant="caption">FitGen v{Constants.expoConfig?.version}</Text>
      </View>

      {nameOpen && <NameDialog current={profile?.name ?? ''} onClose={() => setNameOpen(false)} />}
      {passwordOpen && <PasswordDialog onClose={() => setPasswordOpen(false)} />}
    </Page>
  );
}

/** Apple Health on/off. Permissions per data type are managed by iOS in Settings > Health. */
function AppleHealthItem() {
  const available = isHealthAvailable();
  const { data: enabled } = useHealthEnabled();
  const profile = useProfile();
  const { account } = useHealthSync(profile.data?.id);
  const connectedToAccount = enabled && account.data !== false;
  const toggle = useConnectHealth();

  const connect = async () => {
    try {
      await toggle.mutateAsync(true);
      AppAlert.alert('Apple Saúde conectado', 'Treinos e pesos dos últimos 90 dias serão importados automaticamente para sua conta FitGen. Seus registros feitos no FitGen também serão enviados ao Saúde conforme as permissões.');
    } catch (e) {
      AppAlert.alert('Não foi possível conectar ao Apple Saúde', errorMessage(e));
    }
  };

  const manage = () =>
    AppAlert.alert('Apple Saúde', 'Para escolher quais dados o FitGen pode ler e gravar, abra Ajustes > Saúde > Acesso a Dados > FitGen.', [
      { text: 'Fechar', style: 'cancel' },
      { text: 'Revisar permissões', onPress: connect },
      { text: 'Desconectar', style: 'destructive', onPress: () => { void toggle.mutateAsync(false); } },
    ]);

  return (
    <ListItem
      icon={HeartPulse}
      title="Apple Saúde"
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

  const save = async () => {
    const validation = passwordError(form.next);
    if (!form.old || validation) {
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
        body: { old_password: form.old, new_password: form.next },
      });
      AppAlert.alert('Senha alterada com sucesso!');
      onClose();
    } catch (e) {
      AppAlert.alert('Erro ao alterar senha.', errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const field = { secureTextEntry: true, autoCapitalize: 'none' as const, autoCorrect: false };
  return (
    <Dialog visible onClose={onClose} title="Alterar Senha" description="Altere sua senha de acesso.">
      <Input label="Senha Atual" {...field} textContentType="password" value={form.old} onChangeText={(old) => setForm({ ...form, old })} />
      <Input label="Nova Senha" {...field} textContentType="newPassword" value={form.next} onChangeText={(next) => setForm({ ...form, next })} />
      <Input label="Confirmar Nova Senha" {...field} textContentType="newPassword" value={form.confirm} onChangeText={(confirm) => setForm({ ...form, confirm })} />
      <Row style={{ gap: Spacing.three }}>
        <Button variant="soft" title="Cancelar" onPress={onClose} style={{ flex: 1 }} />
        <Button title="Salvar" onPress={save} loading={loading} style={{ flex: 1 }} />
      </Row>
    </Dialog>
  );
}
