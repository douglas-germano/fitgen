import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, Input, Page, Text, TopBar } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { passwordError } from '@/lib/forms';

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const save = async () => {
    if (busy || !token) return;
    const validation = passwordError(password) || (password !== confirm ? 'As senhas não coincidem.' : '');
    if (validation) { setError(validation); return; }
    setBusy(true); setError('');
    try { await api('/auth/reset-password', { public: true, method: 'POST', body: { token, new_password: password } }); setDone(true); }
    catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  };
  return (
    <Page topBar={<TopBar title="Nova senha" back />}>
      <Text variant="display">{done ? 'Senha alterada.' : 'Crie sua nova senha.'}</Text>
      {done ? <Button title="Entrar" onPress={() => router.replace('/login')} /> : !token ? <>
        <Text muted>Abra o link recebido por email. Se o link expirou, solicite outro.</Text>
        <Button title="Solicitar novo link" onPress={() => router.replace('/forgot-password')} />
      </> : <>
        <Text muted>Use pelo menos 8 caracteres, com uma letra maiúscula, uma minúscula e um número.</Text>
        <Input label="Nova senha" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="newPassword" />
        <Input label="Confirmar senha" value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" autoCorrect={false} />
        {!!error && <Text accessibilityRole="alert">{error}</Text>}
        <Button title="Salvar nova senha" onPress={save} loading={busy} />
      </>}
    </Page>
  );
}
