import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowLeft, ArrowRight, Check, CheckCheck, ChevronRight, Flame, LogOut, Pencil, Sparkles } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type EntryExitAnimationFunction } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, IconButton, Input, ProgressBar, Row, Text, PageSkeleton, QueryError } from '@/components/ui';
import { useProfile } from '@/hooks/queries';
import { api, errorMessage } from '@/lib/api';
import { AppAlert } from '@/lib/feedback';
import { answerError, cleanAnswers, displayAnswer, firstUnanswered, onboardingMessages, onboardingSteps, usesKeyboard, type Answers, type OnboardingMessage } from '@/lib/onboarding';
import { clearOnboardingDraft, readOnboardingDraft, writeOnboardingAnswer } from '@/lib/onboarding-draft';
import { useAuth } from '@/providers/auth';
import { useColors } from '@/providers/theme';
import type { Profile } from '@/types/api';

/** How long the coach "types" before the next question appears. */
const TYPING_MS = 650;
const EASE = Easing.out(Easing.cubic);
/** Gentle rise + fade. The cells of an inverted list are flipped (scaleY -1), so a negative offset rises from below. */
const rise = (duration: number, delay = 0): EntryExitAnimationFunction => () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateY: -10 }] },
    animations: {
      opacity: withDelay(delay, withTiming(1, { duration, easing: EASE })),
      transform: [{ translateY: withDelay(delay, withTiming(0, { duration, easing: EASE })) }],
    },
  };
};
const riseQuestion = rise(260), riseAnswer = rise(180);

function TypingDot({ delay }: { delay: number }) {
  const Colors = useColors(), opacity = useSharedValue(0.3);
  useEffect(() => {
    opacity.set(withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 300 }), withTiming(0.3, { duration: 300 })), -1)));
  }, [delay, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.inkMuted }, style]} />;
}

function TypingBubble() {
  const Colors = useColors();
  return <Animated.View entering={FadeIn.duration(150)} accessibilityLabel="Digitando" style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 16 }}>
    <View style={{ width: 28, height: 28, backgroundColor: Colors.voltSoft, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}><Sparkles size={15} color={Colors.voltInk} /></View>
    <View style={{ flexDirection: 'row', gap: 5, paddingVertical: 18, paddingHorizontal: 18, borderRadius: 22, borderBottomLeftRadius: 6, backgroundColor: Colors.surfaceSunken }}>
      <TypingDot delay={0} /><TypingDot delay={150} /><TypingDot delay={300} />
    </View>
  </Animated.View>;
}

function existingAnswers(profile: Profile): Answers {
  return cleanAnswers({
    ...profile.onboarding_answers,
    name: profile.name, goal: profile.fitness_goal, gender: profile.gender,
    height: profile.height_cm ? String(profile.height_cm) : undefined,
    weight: profile.current_weight_kg ? String(profile.current_weight_kg) : undefined,
    target_weight: profile.target_weight_kg ? String(profile.target_weight_kg) : undefined,
    experience: profile.experience_level, days: profile.available_days,
    activity: profile.activity_level,
  });
}

export default function OnboardingScreen() {
  const Colors = useColors(), insets = useSafeAreaInsets(), reducedMotion = useReducedMotion();
  const { height: windowHeight } = useWindowDimensions();
  const profile = useProfile(), queryClient = useQueryClient(), { signOut } = useAuth();
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0), [value, setValue] = useState<string | string[]>('');
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [saved, setSaved] = useState(false);
  const [error, setError] = useState(''), [storageError, setStorageError] = useState('');
  const [generation, setGeneration] = useState({ workout: false, diet: false });
  const [generating, setGenerating] = useState('');
  const list = useRef<FlatList<OnboardingMessage>>(null), writes = useRef(Promise.resolve()), loadedUser = useRef('');
  const [reviewAfterEdit, setReviewAfterEdit] = useState(false);
  const accepting = useRef(false);
  const [typing, setTyping] = useState(false), typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // The composer's height animates between questions so the chat above slides instead of jumping.
  const composerHeight = useSharedValue(-1), composerStep = useRef<string | undefined>(undefined);
  const composerStyle = useAnimatedStyle(() => (composerHeight.value < 0 ? {} : { height: composerHeight.value }));
  useEffect(() => () => clearTimeout(typingTimer.current), []);
  const step = onboardingSteps[index], reviewing = !step;

  useEffect(() => {
    if (!profile.data?.id || loadedUser.current === profile.data.id) return;
    const user = profile.data, id = user.id;
    let active = true;
    readOnboardingDraft(id).then(draft => {
      if (!active) return;
      const restored = { ...existingAnswers(user), ...draft };
      const next = firstUnanswered(restored);
      setAnswers(restored); setIndex(next);
      setValue(restored[onboardingSteps[next]?.key] ?? (onboardingSteps[next]?.kind === 'multi' ? [] : ''));
      loadedUser.current = id; setReady(true);
    }).catch(() => { if (active) { setReady(true); setStorageError('Não foi possível restaurar o rascunho.'); } });
    return () => { active = false; };
  }, [profile.data]);

  useEffect(() => {
    if (!ready) return;
    // Inverted list: offset 0 is the newest message. Only brings the user back if they had scrolled up.
    const frame = requestAnimationFrame(() => list.current?.scrollToOffset({ offset: 0, animated: !reducedMotion }));
    return () => cancelAnimationFrame(frame);
  }, [index, ready, reducedMotion]);

  const goTo = (next: number, source = answers) => {
    const nextStep = onboardingSteps[next];
    // Keep the same focused input across consecutive text/numeric questions.
    if (!usesKeyboard(nextStep)) Keyboard.dismiss();
    clearTimeout(typingTimer.current); setTyping(false);
    setError(''); setIndex(next);
    setValue(nextStep ? source[nextStep.key] ?? (nextStep.kind === 'multi' ? [] : '') : '');
  };
  const accept = (response = value) => {
    if (!step || accepting.current) return;
    const validation = answerError(step, response);
    if (validation) { setError(validation); return; }
    accepting.current = true;
    const next = { ...answers, [step.key]: typeof response === 'string' ? response.trim() : response };
    setAnswers(next);
    const userId = profile.data?.id;
    if (userId) {
      writes.current = writes.current.catch(() => {}).then(() => writeOnboardingAnswer(userId, step.key, next[step.key]));
      void writes.current.then(() => setStorageError('')).catch(() => setStorageError('Rascunho ainda não salvo no aparelho. Mantenha esta tela aberta até concluir.'));
    }
    const target = reviewAfterEdit ? onboardingSteps.length : index + 1;
    goTo(target, next);
    setReviewAfterEdit(false);
    if (target < onboardingSteps.length && !reducedMotion) {
      setTyping(true);
      typingTimer.current = setTimeout(() => setTyping(false), TYPING_MS);
    }
    requestAnimationFrame(() => { accepting.current = false; });
  };
  const edit = (i: number) => { setReviewAfterEdit(reviewing); goTo(i); };
  const toggle = (option: string) => {
    const selected = Array.isArray(value) ? value : [];
    if (!selected.includes(option) && step.max && selected.length >= step.max) {
      setError(`Escolha até ${step.max} opções.`); return;
    }
    setError(''); setValue(selected.includes(option) ? selected.filter(v => v !== option) : [...selected, option]);
  };
  const save = async () => {
    const missing = firstUnanswered(answers);
    if (missing < onboardingSteps.length) { goTo(missing); return; }
    if (busy) return;
    setBusy(true); setError('');
    try {
      await api('/onboarding/complete', { method: 'POST', body: { answers } });
      await writes.current.catch(() => {});
      if (profile.data?.id) await clearOnboardingDraft(profile.data.id).catch(() => {});
      setSaved(true);
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (e) { setError(errorMessage(e, 'Não foi possível salvar seu perfil. Tente novamente.')); }
    finally { setBusy(false); }
  };
  const generate = async () => {
    if (generating) return;
    setError('');
    try {
      if (!generation.workout) {
        setGenerating('Criando seu treino…');
        await api('/onboarding/generate-workout', { method: 'POST' });
        setGeneration(g => ({ ...g, workout: true }));
        void queryClient.invalidateQueries({ queryKey: ['workouts'] });
      }
      if (!generation.diet) {
        setGenerating('Organizando suas refeições…');
        await api('/diet/generate', { method: 'POST' });
        setGeneration(g => ({ ...g, diet: true }));
        void queryClient.invalidateQueries({ queryKey: ['diet-plan'] });
      }
    } catch (e) { setError(errorMessage(e, 'Não foi possível gerar agora. Seu perfil já está salvo; você pode tentar novamente.')); }
    finally { setGenerating(''); }
  };
  const leave = () => {
    if (profile.data?.onboarding_completed) { router.back(); return; }
    AppAlert.alert('Continuar depois?', 'As respostas confirmadas ficam salvas neste aparelho para você retomar ao entrar na conta.', [
      { text: 'Continuar aqui', style: 'cancel' },
      { text: 'Sair da conta', onPress: () => { void writes.current.catch(() => {}).then(signOut); } },
    ]);
  };

  if (profile.error) return <QueryError title="Seu começo no FitGen" error={profile.error} onRetry={profile.refetch} />;
  if (!ready) return <PageSkeleton title="Preparando sua conversa" back={false} tab={false} />;
  const progress = saved ? 1 : index / onboardingSteps.length;
  const header = <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 16, gap: 16, backgroundColor: Colors.surface }}>
    <Row style={{ gap: 12 }}>
      <IconButton icon={index > 0 && !saved ? ArrowLeft : LogOut} label={index > 0 && !saved ? 'Pergunta anterior' : 'Continuar depois'} onPress={() => index > 0 && !saved ? goTo(index - 1) : leave()} disabled={busy || !!generating} />
      <View style={{ width: 42, height: 42, borderRadius: 16, backgroundColor: Colors.volt, alignItems: 'center', justifyContent: 'center' }}><Flame size={24} color={Colors.onVolt} /></View>
      <View style={{ flex: 1, gap: 2 }}><Text variant="titleMd">Seu começo no FitGen</Text><Text variant="caption">{saved ? 'Tudo pronto para começar' : reviewing ? 'Confira suas respostas' : `${step.section} · ${index + 1} de ${onboardingSteps.length}`}</Text></View>
    </Row>
    <ProgressBar value={progress * 100} />
  </View>;

  if (saved) return <View style={{ flex: 1, backgroundColor: Colors.surface }}>{header}<View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 24 }}>
    <View style={{ width: 72, height: 72, borderRadius: 26, backgroundColor: Colors.volt, justifyContent: 'center', alignItems: 'center' }}><CheckCheck size={34} color={Colors.onVolt} /></View>
    <Text variant="display">Agora o FitGen{`\n`}conhece sua rotina.</Text>
    <Text muted>Seu perfil, seus objetivos e suas preferências foram salvos. Quer criar o primeiro treino e o cardápio da semana com IA?</Text>
    <Card style={{ gap: 12 }}><Row><Check size={18} color={Colors.voltInk} /><Text>Perfil e preferências salvos</Text></Row><Text muted>{generation.workout ? '✓ Treino criado' : 'Treino ainda não gerado'}</Text><Text muted>{generation.diet ? '✓ Plano alimentar criado' : 'Plano alimentar ainda não gerado'}</Text></Card>
    {!!error && <Text accessibilityRole="alert" color={Colors.danger}>{error}</Text>}
    {!(generation.workout && generation.diet) && <Button title={generating || (error ? 'Tentar gerar novamente' : 'Criar meus planos com IA')} onPress={generate} loading={!!generating} />}
    {!!generating && <Text variant="caption">{generating} Isso pode levar um pouco. Mantenha esta tela aberta.</Text>}
    <Button title="Ir para o painel" variant={generation.diet && generation.workout ? 'primary' : 'soft'} disabled={!!generating} onPress={() => router.replace('/(tabs)')} />
  </View></View>;

  const responseInput = !reviewing && usesKeyboard(step) ? <Input
    label={step.unit ? `Sua resposta em ${step.unit}` : step.kind === 'date' ? 'Data de nascimento' : step.kind === 'time' ? 'Horário do treino' : 'Sua resposta'}
    value={typeof value === 'string' ? value : ''}
    onChangeText={v => {
      if (step.kind === 'date' || step.kind === 'time') {
        const raw = v.replace(/\D/g, '').slice(0, step.kind === 'date' ? 8 : 4);
        v = step.kind === 'date' ? raw.replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2}\/\d{2})(\d)/, '$1/$2') : raw.replace(/^(\d{2})(\d)/, '$1:$2');
      }
      setValue(v); setError('');
    }} placeholder={step.placeholder}
    keyboardType={step.kind === 'number' ? 'decimal-pad' : step.kind === 'date' || step.kind === 'time' ? 'number-pad' : 'default'}
    maxLength={step.kind === 'date' ? 10 : step.kind === 'time' ? 5 : step.kind === 'number' ? 8 : step.max ?? 600}
    multiline={step.kind === 'text' && step.key !== 'name'} style={{ maxHeight: 100 }}
    returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => accept()} /> : null;

  return <View style={{ flex: 1, backgroundColor: Colors.surface }}>
    {header}
    <KeyboardAvoidingView style={{ flex: 1, minHeight: 0 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {reviewing ? <Animated.View key="review" entering={reducedMotion ? undefined : FadeIn.duration(240)} style={{ flex: 1 }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Text variant="titleLg">Tudo do seu jeito?</Text>
        <Text muted>Confira as respostas. Toque em qualquer uma para ajustar antes de salvar.</Text>
        {onboardingSteps.map((s, i) => <Pressable key={s.key} accessibilityRole="button" accessibilityLabel={`Editar: ${s.question}`} onPress={() => edit(i)} disabled={busy} style={{ padding: 16, gap: 8, borderRadius: 20, backgroundColor: Colors.surfaceSunken }}>
          <Text variant="caption">{s.question}</Text><Row><Text style={{ flex: 1 }}>{displayAnswer(s, answers[s.key])}</Text><Pencil size={16} color={Colors.inkMuted} /></Row>
        </Pressable>)}
      </ScrollView></Animated.View> : <FlatList ref={list} inverted keyExtractor={item => item.id}
        // While the coach is typing, the next question is held back and a typing bubble takes its place.
        data={typing ? onboardingMessages(answers, index).slice(1) : onboardingMessages(answers, index)}
        ListHeaderComponent={typing ? <TypingBubble /> : undefined}
        style={{ flex: 1, minHeight: 0 }}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentInsetAdjustmentBehavior="never" automaticallyAdjustKeyboardInsets={false}
        initialNumToRender={onboardingSteps.length * 2} contentContainerStyle={{ padding: 20, gap: 16 }}
        ListFooterComponent={<View style={{ paddingBottom: 12, gap: 8 }}><Text variant="titleLg">Vamos montar sua rotina.</Text><Text muted>Uma pergunta por vez. Você pode revisar tudo antes de salvar.</Text></View>}
        renderItem={({ item }) => {
          const mine = item.role === 'user';
          const fresh = !mine && item.index === index, sent = mine && item.index === index - 1;
          return <Animated.View entering={reducedMotion ? undefined : fresh ? riseQuestion : sent ? riseAnswer : undefined} style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: mine ? 'flex-end' : 'flex-start', gap: 8 }}>
            {!mine && <View style={{ width: 28, height: 28, backgroundColor: Colors.voltSoft, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}><Sparkles size={15} color={Colors.voltInk} /></View>}
            <Pressable disabled={!mine} accessibilityRole={mine ? 'button' : undefined} accessibilityLabel={mine ? `Editar: ${item.step.question} ${item.text}` : undefined} onPress={() => edit(item.index)} style={{ maxWidth: '86%', padding: 16, gap: 8, borderRadius: 22, borderBottomLeftRadius: mine ? 22 : 6, borderBottomRightRadius: mine ? 6 : 22, backgroundColor: mine ? Colors.surfaceInverse : Colors.surfaceSunken }}>
              <Row style={{ alignItems: 'center' }}><Text color={mine ? Colors.onInverse : Colors.ink} style={{ flexShrink: 1 }}>{item.text}</Text>{mine && <Pencil size={12} color={Colors.onInverse} />}</Row>
              {!mine && item.step.hint && <Text muted>{item.step.hint}</Text>}
            </Pressable>
          </Animated.View>;
        }} />}
      <Animated.View style={[{ flexShrink: 0, overflow: 'hidden', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: Colors.line, backgroundColor: Colors.surface }, composerStyle]}>
      <View onLayout={e => {
        const h = e.nativeEvent.layout.height, key = step?.key ?? 'review';
        // Same question (typing, errors): follow instantly. New question: slide to the new size.
        const animate = composerHeight.get() >= 0 && composerStep.current !== key && !reducedMotion;
        composerStep.current = key;
        composerHeight.set(animate ? withTiming(h, { duration: 240, easing: EASE }) : h);
      }} style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12), gap: 10 }}>
        {!!storageError && <Text variant="caption" color={Colors.danger}>{storageError}</Text>}
        {!!error && <Text accessibilityRole="alert" color={Colors.danger}>{error}</Text>}
        {reviewing ? <><Text variant="caption">Seus planos atuais só mudam se você gerar novos planos.</Text><Button title="Salvar e continuar" icon={Check} onPress={save} loading={busy} /></> : <>
          {(step.kind === 'single' || step.kind === 'multi') && <Animated.View key={`${step.key}.options`} entering={reducedMotion ? undefined : FadeIn.duration(220).delay(typing ? TYPING_MS - 120 : 0)}><ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: Math.min(320, windowHeight * 0.36) }} contentContainerStyle={{ gap: 8, flexDirection: 'row', flexWrap: 'wrap', paddingBottom: 2 }}>
            {step.options?.map(o => {
              const selected = Array.isArray(value) ? value.includes(o.value) : value === o.value;
              return <Pressable key={o.value} accessibilityRole={step.kind === 'multi' ? 'checkbox' : 'radio'} accessibilityState={{ checked: selected }} onPress={() => step.kind === 'multi' ? toggle(o.value) : accept(o.value)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, width: step.kind === 'single' ? '100%' : undefined, borderWidth: 1, borderColor: selected ? Colors.voltInk : Colors.line, backgroundColor: selected ? Colors.voltSoft : pressed ? Colors.surfaceChip : Colors.surface, paddingVertical: 12, paddingHorizontal: 16, borderRadius: step.kind === 'multi' ? 24 : 18, minHeight: 46 })}>
                <Text style={{ flexShrink: 1, ...(step.kind === 'single' ? { flex: 1 } : {}) }}>{o.label}</Text>{selected ? <Check size={16} color={Colors.voltInk} /> : step.kind === 'single' ? <ChevronRight size={16} color={Colors.inkMuted} /> : null}
              </Pressable>;
            })}
          </ScrollView></Animated.View>}
          {responseInput}
          <Animated.View key={`${step.key}.actions`} entering={reducedMotion ? undefined : FadeIn.duration(220).delay(typing ? TYPING_MS - 120 : 0)} style={{ gap: 10 }}>
          {step.kind !== 'single' && <Button title={reviewAfterEdit ? 'Confirmar alteração' : index === onboardingSteps.length - 1 ? 'Revisar minhas respostas' : 'Continuar'} icon={ArrowRight} onPress={() => accept()} />}
          {step.optional && <Pressable accessibilityRole="button" onPress={() => accept(step.kind === 'multi' ? [] : '')} style={{ alignItems: 'center', padding: 8, minHeight: 36 }}><Text muted variant="label">{step.kind === 'multi' ? 'Nenhuma destas opções' : 'Pular por enquanto'}</Text></Pressable>}
          {step.kind === 'single' && <Text variant="caption" style={{ textAlign: 'center' }}>Toque em uma opção para continuar</Text>}
          </Animated.View>
        </>}
      </View></Animated.View>
    </KeyboardAvoidingView>
  </View>;
}
