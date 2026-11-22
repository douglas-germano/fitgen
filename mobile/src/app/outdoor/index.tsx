import { router, useFocusEffect } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { Bike, Check, Footprints, LocateFixed, Pause, Play, Zap } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { OutdoorMap } from '@/components/outdoor-map';
import { OutdoorStats } from '@/components/outdoor-summary';
import { Button, Page, Row, Text, TopBar } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useProfile } from '@/hooks/queries';
import { useColors } from '@/providers/theme';
import { AppAlert } from '@/lib/feedback';
import { estimatedCalories, OUTDOOR_NAMES, outdoorName, type OutdoorType } from '@/lib/outdoor';
import { enableOutdoorBackground, requestOutdoorLocation, startOutdoorLocation, stopOutdoorLocation } from '@/lib/outdoor-location';
import { durationSeconds, finishDraft, pauseDraft, readDraft, removeDraft, writeDraft, type OutdoorDraft } from '@/lib/outdoor-recording';
import { randomUUID } from 'expo-crypto';
import { useQueryClient } from '@tanstack/react-query';

function KeepScreenAwake() {
  useKeepAwake('outdoor-gps', { suppressDeactivateWarnings: true });
  return null;
}

const announceError = (error: unknown) => AppAlert.alert('Atividade ao ar livre', error instanceof Error ? error.message : 'Tente novamente.');
const ACTIVITY_OPTIONS = [
  { value: 'run', Icon: Zap },
  { value: 'walk', Icon: Footprints },
  { value: 'bike', Icon: Bike },
] as const;

export default function OutdoorScreen() {
  const colors = useColors();
  const { width, fontScale } = useWindowDimensions();
  const stackActions = width / Math.max(1, fontScale) < 300;
  const profile = useProfile().data;
  const owner = profile?.id;
  const query = useQueryClient();
  const [type, setType] = useState<OutdoorType>('run');
  const [draft, setDraft] = useState<OutdoorDraft | null>(null);
  const [now, setNow] = useState(Date.now);
  const [busy, setBusy] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<string>();
  const [backgroundAllowed, setBackgroundAllowed] = useState(false);
  const activeScreen = useRef(false);
  const startInProgress = useRef(false);

  const pause = useCallback((at = Date.now()) => {
    if (!owner) return;
    const current = readDraft(owner);
    if (current?.runningSince == null) return;
    setNow(at);
    setDraft(pauseDraft(current, at));
    void stopOutdoorLocation().catch(announceError);
  }, [owner]);

  useFocusEffect(useCallback(() => {
    if (!owner) return;
    activeScreen.current = true;
    try {
      const current = readDraft(owner);
      if (current?.runningSince != null) {
        setDraft(pauseDraft(current, Math.max(current.runningSince, current.lastFix ?? 0)));
        void stopOutdoorLocation().catch(announceError);
      } else {
        setDraft(current);
      }
    } catch (error) {
      announceError(error);
    }
    return () => {
      activeScreen.current = false;
      pause();
    };
  }, [owner, pause]));

  useEffect(() => {
    if (!owner || draft?.runningSince == null) return;
    const tick = () => {
      const timestamp = Date.now();
      const current = readDraft(owner);
      setNow(timestamp);
      if (current && durationSeconds(current, timestamp) >= 86400) pause(timestamp);
      else setDraft(current);
    };
    const timer = setInterval(tick, 1000);
    const state = AppState.addEventListener('change', (next) => {
      if (next === 'active') tick();
      else if (next === 'background' && readDraft(owner)?.background === false) pause();
    });
    return () => { clearInterval(timer); state.remove(); };
  }, [draft?.runningSince, owner, pause]);

  async function start() {
    if (!owner || startInProgress.current) return;
    startInProgress.current = true;
    setBusy(true);
    setGpsMessage(undefined);
    let current: OutdoorDraft | null = null;
    try {
      current = readDraft(owner);
      await stopOutdoorLocation();
      await requestOutdoorLocation();
      if (!activeScreen.current) return;
      const timestamp = Date.now();
      const recording: OutdoorDraft = {
        id: current?.id ?? randomUUID(),
        owner,
        type: current?.type ?? type,
        weight: current ? current.weight : profile.current_weight_kg,
        started: current?.started ?? timestamp,
        activeMs: current?.activeMs ?? 0,
        runningSince: timestamp,
        lastFix: current?.lastFix ?? null,
        lastPointAt: null,
        background: false,
        route: current?.route ?? [],
        meters: current?.meters ?? 0,
      };
      // Register the watcher after storing its draft so the first GPS fix can be accepted.
      writeDraft(recording);
      let gpsFailed = false;
      const background = await startOutdoorLocation(owner, recording.id, () => {
        gpsFailed = true;
        setGpsMessage('Sinal GPS indisponível. Verifique a permissão e tente retomar em um local aberto.');
        pause();
      });
      const tracked = readDraft(owner);
      if (!activeScreen.current || gpsFailed || tracked?.runningSince == null) {
        await stopOutdoorLocation();
        if (gpsFailed && activeScreen.current) {
          if (current) writeDraft(current);
          else removeDraft(owner);
          setDraft(current);
        }
        return;
      }
      const updated = { ...tracked, background };
      writeDraft(updated);
      setNow(Date.now());
      setDraft(updated);
    } catch (error) {
      if (current) writeDraft(current);
      else removeDraft(owner);
      if (activeScreen.current) {
        setDraft(current);
        announceError(error);
      }
    } finally {
      startInProgress.current = false;
      setBusy(false);
    }
  }

  function finish() {
    if (!owner) return;
    try {
      const current = readDraft(owner);
      if (!current) return;
      const timestamp = Date.now();
      if (!durationSeconds(current, timestamp)) return;
      const record = finishDraft(current, timestamp);
      void stopOutdoorLocation().catch(announceError);
      setDraft(null);
      void query.invalidateQueries({ queryKey: ['workout-history'] });
      router.replace({ pathname: '/outdoor/[id]', params: { id: record.id } });
    } catch (error) {
      announceError(error);
    }
  }

  function discard() {
    if (!owner) return;
    AppAlert.alert('Descartar atividade?', 'O tempo e o trajeto desta sessão serão apagados.', [
      { text: 'Continuar atividade', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => {
        removeDraft(owner);
        void stopOutdoorLocation().catch(announceError);
        setDraft(null);
      } },
    ]);
  }

  const running = draft?.runningSince != null;
  const seconds = draft ? durationSeconds(draft, now) : 0;
  const gpsReady = running && draft.lastFix !== null && draft.lastFix >= draft.runningSince!
    && now - draft.lastFix <= 45_000;

  const gpsStatus = running ? (gpsReady ? 'GPS ativo' : 'Buscando sinal GPS…') : 'Atividade pausada';

  const controls = draft ? (
    <View style={{ flexDirection: stackActions ? 'column' : 'row', gap: Spacing.two }}>
      <Button title={running ? 'Pausar' : 'Retomar'} icon={running ? Pause : Play} size="lg"
        style={stackActions ? undefined : { flex: 1 }} onPress={running ? () => pause() : () => void start()}
        loading={busy} disabled={seconds >= 86400} />
      <Button title="Finalizar" accessibilityLabel="Finalizar atividade" variant="soft" size="lg"
        style={stackActions ? undefined : { flex: 1 }} disabled={!seconds || busy} onPress={finish} />
    </View>
  ) : (
    <Button title={OUTDOOR_NAMES[type].start} icon={Play} size="lg"
      onPress={() => void start()} loading={busy} disabled={!owner} />
  );

  return (
    <Page topBar={<TopBar title="Ao ar livre" back />} footer={controls}>
      {!draft ? (
        <>
          <View style={{ gap: Spacing.two }}>
            <Text variant="display" accessibilityRole="header">Qual atividade?</Text>
            <Text muted style={{ fontSize: 16, lineHeight: 23 }}>
              Registre o tempo, a distância e o trajeto pelo GPS.
            </Text>
          </View>

          <View accessibilityRole="radiogroup" accessibilityLabel="Tipo de atividade" style={{ gap: Spacing.two }}>
            {ACTIVITY_OPTIONS.map(({ value, Icon }) => {
              const selected = type === value;
              return (
                <Pressable key={value} accessibilityRole="radio" aria-checked={selected}
                  onPress={() => setType(value)} disabled={busy}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center', gap: Spacing.three,
                    minHeight: 60, padding: Spacing.four, borderRadius: Radius.md, borderCurve: 'continuous',
                    borderWidth: StyleSheet.hairlineWidth, borderColor: selected ? colors.voltInk : colors.line,
                    backgroundColor: selected ? colors.voltSoft : pressed ? colors.surfaceChip : colors.surfaceSunken,
                  })}>
                  <Icon size={22} color={selected ? colors.voltInk : colors.inkMuted} />
                  <Text variant="titleMd" style={{ flex: 1 }}>{OUTDOOR_NAMES[value].title}</Text>
                  {selected && <Check size={20} color={colors.voltInk} />}
                </Pressable>
              );
            })}
          </View>

          {Platform.OS === 'ios' && !backgroundAllowed && (
            <View style={{ gap: Spacing.two, paddingTop: Spacing.four, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line }}>
              <Row>
                <LocateFixed size={18} color={colors.inkMuted} />
                <Text variant="titleMd" style={{ flex: 1 }}>GPS com o iPhone bloqueado</Text>
              </Row>
              <Text muted>Para continuar registrando o trajeto com a tela bloqueada, permita a localização em segundo plano.</Text>
              <Pressable accessibilityRole="button" disabled={busy} style={{ minHeight: 44, justifyContent: 'center' }} onPress={() => {
                void enableOutdoorBackground().then((allowed) => {
                  setBackgroundAllowed(allowed);
                  if (!allowed) setGpsMessage('Para registrar com a tela bloqueada, selecione Sempre nos ajustes de localização do FitGen.');
                }).catch(announceError);
              }}>
                <Text variant="titleSm" color={colors.voltInk}>Permitir GPS em segundo plano</Text>
              </Pressable>
            </View>
          )}
          {Platform.OS === 'web' && <Text variant="label" muted>Mantenha esta aba visível para registrar o trajeto.</Text>}
        </>
      ) : (
        <>
          {running && !draft.background && <KeepScreenAwake />}
          <View style={{ gap: Spacing.two }}>
            <Text variant="display" accessibilityRole="header">{outdoorName(draft.type)}</Text>
            <Row>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: gpsReady ? colors.voltInk : colors.lineStrong }} />
              <Text variant="label" color={gpsReady ? colors.voltInk : colors.inkMuted} accessibilityLiveRegion="polite">
                {gpsStatus}
              </Text>
            </Row>
            {running && !draft.background && <Text variant="label" muted>Mantenha esta tela aberta durante o percurso.</Text>}
          </View>

          <OutdoorStats type={draft.type} seconds={seconds} meters={draft.meters}
            calories={estimatedCalories(draft.type, draft.meters, draft.weight, seconds)} />
          <OutdoorMap live={running} route={draft.route} emptyMessage="O trajeto aparece após o primeiro ponto de GPS." />
          {!running && (
            <Pressable accessibilityRole="button" onPress={discard} disabled={busy}
              style={{ minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' }}>
              <Text variant="titleSm" color={colors.danger}>Descartar atividade</Text>
            </Pressable>
          )}
        </>
      )}
      {gpsMessage && <Text variant="label" muted accessibilityLiveRegion="polite">{gpsMessage}</Text>}
    </Page>
  );
}
