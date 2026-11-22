import { router } from 'expo-router';
import { UserPlus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { track } from '@/lib/analytics';
import { SocialSignIn } from '@/components/social-sign-in';
import { BadgeIcon, Button, Input, LinkText, Page, Text, TopBar } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { api, errorMessage } from '@/lib/api';
import { passwordError, validEmail } from '@/lib/forms';
import { useAuth } from '@/providers/auth';

export default function RegisterScreen() {
  const { signIn } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState('');
  const change = (key: keyof typeof form, value: string) => { setForm({ ...form, [key]: value }); setError(''); };

  const submit = async () => {
    if (busy) return;
    const validation = !form.name.trim() ? 'Informe seu nome.' : !validEmail(form.email) ? 'Informe um email válido.' : passwordError(form.password) || (form.password !== form.confirm ? 'As senhas não coincidem.' : '');
    if (validation) { setError(validation); return; }
    setBusy(true);
    setError('');
    try {
      if (!created) {
        await api('/auth/register', { public: true, method: 'POST', body: { name: form.name.trim(), email: form.email.trim().toLowerCase(), password: form.password, ...(form.phone ? { phone: form.phone.replace(/\D/g, '') } : {}) } });
        setCreated(true);
        track('signed_up');
      }
      await signIn(form.email, form.password);
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  };

  return (
    <Page topBar={<TopBar title="Criar conta" back />}>
      <View style={{ gap: Spacing.three }}>
        <BadgeIcon icon={UserPlus} size={48} />
        <Text variant="display">Vamos começar.</Text>
        <Text muted>Crie sua conta e configure seus objetivos de treino e alimentação.</Text>
      </View>
      {!created && <SocialSignIn />}
      <Input label="Nome completo" value={form.name} onChangeText={(v) => change('name', v)} autoComplete="name" editable={!created} />
      <Input label="Email" value={form.email} onChangeText={(v) => change('email', v)} keyboardType="email-address" autoCapitalize="none" autoComplete="email" editable={!created} />
      <Input label="Celular com DDD (opcional)" value={form.phone} onChangeText={(v) => change('phone', v)} keyboardType="phone-pad" editable={!created} />
      <Input label="Senha" value={form.password} onChangeText={(v) => change('password', v)} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="newPassword" />
      <Text variant="caption">Pelo menos 8 caracteres, com maiúscula, minúscula e número.</Text>
      <Input label="Confirmar senha" value={form.confirm} onChangeText={(v) => change('confirm', v)} secureTextEntry autoCapitalize="none" autoCorrect={false} />
      {!!error && <Text accessibilityRole="alert">{error}</Text>}
      {created && <Text muted>Conta criada. Entre com sua senha para continuar.</Text>}
      <Button size="lg" title={created ? 'Entrar na conta' : 'Criar conta'} onPress={submit} loading={busy} />
      <LinkText title="Já tenho conta" onPress={() => router.replace('/login')} />
    </Page>
  );
}
