import { router, useFocusEffect } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { Footprints, MapPin, Route } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, View } from 'react-native';

import { OutdoorStats, OutdoorTrace } from '@/components/outdoor-summary';
import { Button, Card, Chips, Page, Text, TopBar } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useProfile } from '@/hooks/queries';
import { AppAlert } from '@/lib/feedback';
import { estimatedCalories, outdoorName, type OutdoorType } from '@/lib/outdoor';
import { enableOutdoorBackground, requestOutdoorLocation, startOutdoorLocation, stopOutdoorLocation } from '@/lib/outdoor-location';
import { durationSeconds, finishDraft, pauseDraft, readDraft, removeDraft, writeDraft, type OutdoorDraft } from '@/lib/outdoor-recording';
import { randomUUID } from 'expo-crypto';
import { useQueryClient } from '@tanstack/react-query';

function KeepScreenAwake() {
  useKeepAwake('outdoor-gps', { suppressDeactivateWarnings: true });
  return null;
}

const announceError = (error: unknown) => AppAlert.alert('Atividade ao ar livre', error instanceof Error ? error.message : 'Tente novamente.');

export default function OutdoorScreen() {
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

  return (
    <Page tab={false} topBar={<TopBar title="Ao ar livre" back />}>
      {!draft ? (
        <>
          <Card style={{ gap: Spacing.three }}>
            <Text variant="titleLg">Corrida ou caminhada</Text>
            <Text muted>Escolha sua atividade para acompanhar tempo, distância e trajeto por GPS.</Text>
            <Chips value={type} onChange={setType} options={[
              { value: 'run', label: 'Corrida' },
              { value: 'walk', label: 'Caminhada' },
            ]} />
            <Button title={type === 'run' ? 'Iniciar corrida' : 'Iniciar caminhada'} icon={Footprints}
              onPress={() => void start()} loading={busy} disabled={!owner} />
          </Card>
          {Platform.OS === 'ios' && !backgroundAllowed && (
            <Card style={{ gap: Spacing.two }}>
              <Text variant="titleSm">GPS com a tela bloqueada</Text>
              <Text muted>Permita o acesso à localização em segundo plano para guardar o trajeto com o iPhone bloqueado.</Text>
              <Button variant="soft" title="Permitir GPS em segundo plano" disabled={busy} onPress={() => {
                void enableOutdoorBackground().then((allowed) => {
                  setBackgroundAllowed(allowed);
                  if (!allowed) setGpsMessage('Para registrar com a tela bloqueada, selecione Sempre nos ajustes de localização do FitGen.');
                }).catch(announceError);
              }} />
            </Card>
          )}
          {Platform.OS === 'web' && <Text muted>Mantenha esta aba visível durante a atividade para registrar o GPS.</Text>}
        </>
      ) : (
        <>
          {running && !draft.background && <KeepScreenAwake />}
          <View style={{ gap: Spacing.one }}>
            <Text variant="titleLg">{outdoorName(draft.type)}</Text>
            <Text variant="caption" accessibilityLiveRegion="polite">
              {running ? (gpsReady ? 'GPS ativo' : 'Procurando sinal GPS…') : 'Atividade pausada'}
            </Text>
            {running && !draft.background && <Text muted>Mantenha esta tela aberta durante o percurso.</Text>}
          </View>
          <OutdoorStats seconds={seconds} meters={draft.meters} calories={estimatedCalories(draft.type, draft.meters, draft.weight)} />
          <Button title={running ? 'Pausar' : 'Retomar'} onPress={running ? () => pause() : () => void start()}
            loading={busy} disabled={seconds >= 86400} />
          <Button title="Finalizar atividade" icon={Route} variant="soft" disabled={!seconds || busy} onPress={finish} />
          {!running && <Button title="Descartar atividade" variant="soft" disabled={busy} onPress={discard} />}
          <OutdoorTrace route={draft.route} />
          {!draft.route.length && <Card style={{ gap: Spacing.two }}>
            <MapPin size={20} />
            <Text muted>Assim que o GPS encontrar sua posição, o trajeto aparece aqui.</Text>
          </Card>}
        </>
      )}
      {gpsMessage && <Text muted accessibilityLiveRegion="polite">{gpsMessage}</Text>}
    </Page>
  );
}
