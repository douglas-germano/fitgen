import { AppAlert, AppActionSheet } from '@/lib/feedback';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { ArrowUpRight, Bot } from 'lucide-react-native';
import { useCallback, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoachTools } from '@/components/coach-tools';
import { CoachExerciseSwap } from '@/components/coach-exercise-swap';
import { Markdown } from '@/components/markdown';
import { OttoArrival, OttoAvatar, OTTO_GREETING_DELAY, OTTO_KEYBOARD_DELAY } from '@/components/otto';
import { PremiumLocked } from '@/components/premium-locked';
import { usePremium } from '@/hooks/use-premium';
import { Avatar, IconButton, MoreButton, QueryError, Row, Text, TopBar } from '@/components/ui';
import { Motion } from '@/constants/motion';
import { fontFor, Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';
import { useChatHistory, useProfile } from '@/hooks/queries';
import { api, errorMessage } from '@/lib/api';
import { coachToolForMessage, type CoachTool, type CoachToolRequest } from '@/lib/coach-tools';
import { chatMessageKey, localChatMessage } from '@/lib/chat';
import type { ChatMessage } from '@/types/api';

const QUICK_PROMPTS = [
  { label: 'Ajustar dieta', message: 'Quero ajustar minha dieta. O que você sugere com base no meu progresso?' },
  { label: 'Trocar exercício', message: 'Quero trocar um exercício do meu treino de hoje. Quais alternativas você sugere?' },
  { label: 'Dor muscular', message: 'Estou com dor muscular. Devo treinar hoje ou descansar?' },
];
const WEB_TOOLS: { label: string; tool: CoachTool }[] = [
  { label: 'Adaptar treino', tool: 'adapt' },
  { label: 'Revisar semana', tool: 'week' },
  { label: 'Ajustar refeição', tool: 'diet' },
];
const ANCHOR = { minIndexForVisible: 0 };

/** IA Coach is Premium (freemium): free users see what it does and how to unlock it. */
export default function CoachScreen() {
  const { locked } = usePremium();
  if (locked('coach')) {
    return (
      <PremiumLocked
        feature="coach"
        title="IA Coach"
        icon={Bot}
        headline="Seu coach de IA, 24h"
        description="Tire dúvidas sobre treino e dieta, troque exercícios e ajuste seu plano conversando com o Otto."
        perks={['Respostas com base nos seus treinos, refeições e medidas', 'Ajustes de dieta e de treino na hora', 'Também pelo WhatsApp']}
      />
    );
  }
  return <CoachChat />;
}

/** Chat uses native keyboard timing and anchored messages; layout changes never force a scroll. */
function CoachChat() {
  const Colors = useColors();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const { data: history = [], isLoading, error, refetch } = useChatHistory();
  const { data: profile } = useProfile();
  const [activeTool, setActiveTool] = useState<CoachToolRequest | 'swap' | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);
  const sendingRef = useRef(false);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const openedKeyboard = useRef(false);
  const messageSequence = useRef(0);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  // Stack screen opened from the home page: only the home indicator sits below the composer.
  const bottomInset = insets.bottom;
  const messages = [...history].reverse();
  const canSend = !!input.trim() && !sending && !isLoading;
  const latest = history[history.length - 1];
  const latestKey = latest ? chatMessageKey(latest, history.length - 1) : null;

  useFocusEffect(useCallback(() => {
    if (Platform.OS === 'web' || isLoading || error || !showGreeting || openedKeyboard.current) return;
    const timer = setTimeout(() => {
      openedKeyboard.current = true;
      inputRef.current?.focus();
    }, reducedMotion ? 0 : OTTO_KEYBOARD_DELAY);
    return () => clearTimeout(timer);
  }, [error, isLoading, reducedMotion, showGreeting]));

  useFocusEffect(useCallback(() => {
    if (isLoading || !latestKey) return;
    // One native scroll per new message or screen focus; keyboard layout changes never restart it.
    const frame = requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: !reducedMotion }));
    return () => cancelAnimationFrame(frame);
  }, [isLoading, latestKey, reducedMotion]));

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || sendingRef.current || isLoading || error) return;
    const tool = Platform.OS === 'web' ? coachToolForMessage(message) : undefined;
    if (tool) {
      setActiveTool(tool);
      setShowGreeting(false);
      setInput('');
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      return;
    }
    sendingRef.current = true;
    const user = localChatMessage('user', message, ++messageSequence.current);
    setShowGreeting(false);
    setInput('');
    setSending(true);
    queryClient.setQueryData<ChatMessage[]>(['chat'], (old = []) => [...old, user]);
    try {
      const response = await api<{ answer: string }>('/chat', { method: 'POST', body: { message } });
      const answer = localChatMessage('model', response.answer, ++messageSequence.current);
      queryClient.setQueryData<ChatMessage[]>(['chat'], (old = []) => [...old, answer]);
    } catch (error) {
      queryClient.setQueryData<ChatMessage[]>(['chat'], (old = []) => old.filter((entry) => entry.id !== user.id));
      setInput((draft) => draft || message);
      AppAlert.alert('Erro ao enviar mensagem.', errorMessage(error));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const clearHistory = () => AppAlert.alert('Limpar todo o histórico de conversas?', undefined, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Limpar', style: 'destructive', onPress: async () => {
      try {
        await api('/chat/clear', { method: 'DELETE' });
        queryClient.setQueryData(['chat'], []);
      } catch (error) { AppAlert.alert('Erro ao limpar histórico.', errorMessage(error)); }
    } },
  ]);
  const openMenu = () => {
    if (sendingRef.current) return;
    if (Platform.OS === 'ios') {
      AppActionSheet.showActionSheetWithOptions(
        { options: ['Limpar conversa', 'Cancelar'], destructiveButtonIndex: 0, cancelButtonIndex: 1 },
        (index) => { if (index === 0) clearHistory(); },
      );
    } else clearHistory();
  };

  if (error) return <QueryError title="Otto" back error={error} onRetry={refetch} />;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.surface, paddingTop: insets.top + Spacing.three }}>
      <View style={{ paddingHorizontal: Spacing.five, paddingBottom: Spacing.three }}>
        <TopBar title="Otto" back action={<MoreButton onPress={openMenu} />} />
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1, minHeight: 0 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={-bottomInset}>
        {isLoading ? <ActivityIndicator style={{ flex: 1 }} color={Colors.inkMuted} /> : (
          <FlatList
            ref={listRef}
            style={{ flex: 1, minHeight: 0 }}
            inverted
            data={messages}
            keyExtractor={chatMessageKey}
            maintainVisibleContentPosition={ANCHOR}
            contentInsetAdjustmentBehavior="never"
            automaticallyAdjustKeyboardInsets={false}
            contentContainerStyle={{ paddingHorizontal: Spacing.five, paddingVertical: Spacing.four, gap: Spacing.four, flexGrow: 1 }}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={sending ? (
              <Row style={{ alignItems: 'center', paddingVertical: Spacing.two }} accessibilityLiveRegion="polite">
                <OttoAvatar />
                <ActivityIndicator size="small" color={Colors.inkMuted} />
                <Text variant="caption">Preparando resposta…</Text>
              </Row>
            ) : activeTool === 'swap' ? <CoachExerciseSwap /> : activeTool ? <CoachTools key={JSON.stringify(activeTool)} request={activeTool} /> : undefined}
            renderItem={({ item }) => {
              const mine = item.role === 'user';
              const fresh = item.id?.startsWith('local-');
              return (
                <Animated.View entering={fresh && !reducedMotion ? FadeIn.duration(Motion.message) : undefined}
                  style={{ flexDirection: 'row', justifyContent: mine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: Spacing.two }}>
                  {!mine && <OttoAvatar />}
                  <View style={{ flexShrink: 1, maxWidth: '86%', backgroundColor: mine ? Colors.surfaceInverse : Colors.surfaceSunken, borderRadius: 20, borderBottomRightRadius: mine ? 6 : 20, borderBottomLeftRadius: mine ? 20 : 6, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three }}>
                    {mine ? <Text color={Colors.onInverse} style={{ fontSize: 15, lineHeight: 22 }} selectable>{item.content}</Text> : <Markdown content={item.content} />}
                  </View>
                  {mine && <Avatar size={28} name={profile?.name} uri={profile?.profile_picture} />}
                </Animated.View>
              );
            }}
          />
        )}
        {showGreeting && !isLoading && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two, paddingHorizontal: Spacing.five, paddingBottom: Spacing.two, zIndex: 2 }}>
            <OttoArrival size={38} variant="chat" />
            <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(360).delay(OTTO_GREETING_DELAY)}
              style={{ flexShrink: 1, backgroundColor: Colors.surfaceSunken, borderRadius: 20, borderBottomLeftRadius: 6, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three }}>
              <Text>Como posso te ajudar hoje?</Text>
            </Animated.View>
          </View>
        )}
        <View style={{ paddingHorizontal: Spacing.five, paddingTop: Spacing.three, paddingBottom: Spacing.three + bottomInset, gap: Spacing.three, flexShrink: 0, borderTopWidth: 1, borderTopColor: Colors.line, backgroundColor: Colors.surface }}>
          <Row style={{ gap: Spacing.two }}>
            {QUICK_PROMPTS.map((prompt) => (
              <Pressable key={prompt.label} onPress={() => {
                if (Platform.OS === 'web' && prompt.label === 'Trocar exercício') {
                  setShowGreeting(false);
                  setActiveTool((current) => current === 'swap' ? null : 'swap');
                  listRef.current?.scrollToOffset({ offset: 0, animated: false });
                  return;
                }
                void send(prompt.message);
              }} disabled={sending || isLoading} accessibilityRole="button"
                style={({ pressed }) => ({ flex: 1, minHeight: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.two, backgroundColor: pressed ? Colors.line : Colors.surfaceChip, opacity: sending ? 0.6 : 1 })}>
                <Text variant="label" muted numberOfLines={1} adjustsFontSizeToFit>{prompt.label}</Text>
              </Pressable>
            ))}
          </Row>
          {Platform.OS === 'web' && (
            <Row style={{ gap: Spacing.two, flexWrap: 'wrap' }}>
              {WEB_TOOLS.map(({ label, tool }) => (
                <Pressable key={tool} accessibilityRole="button" accessibilityState={{ selected: activeTool !== 'swap' && activeTool?.tool === tool }}
                  disabled={sending || isLoading} onPress={() => {
                    setShowGreeting(false);
                    setActiveTool((current) => current !== 'swap' && current?.tool === tool ? null : { tool });
                    listRef.current?.scrollToOffset({ offset: 0, animated: false });
                  }}
                  style={{ minHeight: 36, paddingHorizontal: Spacing.three, borderRadius: 18, justifyContent: 'center', backgroundColor: activeTool !== 'swap' && activeTool?.tool === tool ? Colors.voltSoft : Colors.surfaceChip }}>
                  <Text variant="label" color={activeTool !== 'swap' && activeTool?.tool === tool ? Colors.voltInk : Colors.inkMuted}>{label}</Text>
                </Pressable>
              ))}
            </Row>
          )}
          <Row style={{ gap: Spacing.two, alignItems: 'flex-end' }}>
            <TextInput ref={inputRef} onFocus={() => { openedKeyboard.current = true; }} value={input} onChangeText={setInput} placeholder="Pergunte sobre treino ou dieta…" placeholderTextColor={Colors.inkMuted}
              selectionColor={Colors.ink} cursorColor={Colors.ink} multiline accessibilityLabel="Mensagem para o Otto"
              style={{ flex: 1, minHeight: 52, maxHeight: 120, backgroundColor: Colors.surfaceChip, color: Colors.ink, borderRadius: 26, paddingHorizontal: Spacing.five, paddingTop: 15, paddingBottom: 15, fontSize: 15, fontFamily: fontFor(400) }} />
            <IconButton icon={ArrowUpRight} label="Enviar mensagem" variant="volt" size="xl" onPress={() => send()} disabled={!canSend} loading={sending} />
          </Row>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
