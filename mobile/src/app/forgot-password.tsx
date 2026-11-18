import { router } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { BadgeIcon, Button, Input, LinkText, Page, Row, Text, TopBar } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';
import { api, errorMessage } from '@/lib/api';
import { validEmail } from '@/lib/forms';

export default function ForgotPasswordScreen() {
  const Colors = useColors();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (loading) return;
    if (!validEmail(email)) { setError('Informe um email válido.'); return; }
    setLoading(true);
    setError('');
    try {
      await api('/auth/forgot-password', { method: 'POST', body: { email: email.trim().toLowerCase() }, public: true });
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page
      tab={false}
      topBar={<TopBar title="Recuperar Senha" back />}
      footer={
        <Row style={{ justifyContent: 'center', gap: 4 }}>
          <Text muted>Lembrou a senha?</Text>
          <LinkText title="Voltar ao login" style={{ fontSize: 14, fontWeight: '600' }} onPress={() => router.back()} />
        </Row>
      }>
      <View style={{ gap: Spacing.four, paddingTop: Spacing.six }}>
        <BadgeIcon icon={Mail} size={44} />
        <Text variant="display" accessibilityRole="header">
          Esqueceu a senha?
        </Text>
        <Text muted style={{ fontSize: 15, lineHeight: 22 }}>
          Informe seu email e enviaremos um link para criar uma nova senha.
        </Text>
      </View>

      <View style={{ gap: Spacing.four }}>
        <Input
          label="Email"
          placeholder="seu@email.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          error={error || undefined}
        />
        <Button size="lg" title="Enviar Link" onPress={handleSubmit} loading={loading} disabled={!email} />
      </View>

      {sent && (
        <Row
          accessibilityLiveRegion="polite"
          style={{ gap: Spacing.three, padding: Spacing.five, borderRadius: Radius.md, backgroundColor: Colors.voltSoft, alignItems: 'flex-start' }}>
          <BadgeIcon icon={Mail} size={28} />
          <Text style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>
            Se o email estiver cadastrado, você receberá as instruções para redefinir sua senha.
          </Text>
        </Row>
      )}
    </Page>
  );
}
