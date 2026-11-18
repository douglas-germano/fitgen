import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { track } from '@/lib/analytics';
import { BrandLockup } from '@/components/brand';
import { Button, Input, LinkText, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';
import { Motion } from '@/constants/motion';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/providers/auth';

export default function LoginScreen() {
  const Colors = useColors();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      // On success the auth guard swaps the stack to the tabs automatically.
      await signIn(email, password);
      track('logged_in');
    } catch (e) {
      setError(errorMessage(e, 'Falha ao realizar login'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.surface }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: Spacing.five,
            paddingTop: insets.top + 56,
            paddingBottom: insets.bottom + Spacing.six,
          }}>
          <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(Motion.message)} style={{ gap: Spacing.six }}>
            <BrandLockup size={52} />
            <View style={{ gap: Spacing.three }}>
              <Text variant="display" accessibilityRole="header">
                Sua evolução começa aqui.
              </Text>
              <Text muted style={{ fontSize: 15, lineHeight: 22 }}>
                Digite seu email e senha para acessar sua conta.
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
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
              />
              <Input
                label="Senha"
                labelRight={
                  <Link href="/forgot-password" asChild>
                    <Pressable hitSlop={8} accessibilityRole="link">
                      <Text variant="label" color={Colors.voltInk} style={{ textDecorationLine: 'underline' }}>
                        Esqueceu a senha?
                      </Text>
                    </Pressable>
                  </Link>
                }
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                error={error || undefined}
                right={
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                    <Text muted>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
                  </Pressable>
                }
              />
              <Button size="lg" title="Entrar" onPress={handleSubmit} loading={loading} disabled={!email || !password} />
            </View>
          </Animated.View>

          <View style={{ flex: 1, minHeight: Spacing.eight }} />
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
            <Text muted>Ainda não tem conta?</Text>
            <LinkText
              title="Criar conta"
              style={{ fontSize: 14, fontWeight: '600' }}
              onPress={() => router.push('/register')}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
