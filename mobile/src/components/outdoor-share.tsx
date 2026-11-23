import { Copy, Download, Share2, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, PixelRatio, Platform, Pressable, useWindowDimensions, View } from 'react-native';
import Svg from 'react-native-svg';

import { BRAND_MARK_ASSET } from '@/components/brand';
import { OutdoorShareArtwork, outdoorShareModels, type OutdoorShareModel } from '@/components/outdoor-share-artwork';
import { Button, IconButton, Page, Row, Text, TopBar } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import type { OutdoorRecord } from '@/lib/outdoor-recording';
import { activityPngExportMode, canCopyActivityPng, copyActivityPng, loadActivityMark, shareActivityPng } from '@/lib/share-activity';
import { useColors } from '@/providers/theme';

function Choice({ title, selected, disabled, onPress }: {
  title: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled}
      onPress={onPress} style={{
        minHeight: 38, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: Radius.full,
        backgroundColor: selected ? colors.voltSoft : colors.surfaceSunken,
        borderWidth: 1, borderColor: selected ? colors.voltInk : colors.line,
      }}>
      <Text variant="label" color={selected ? colors.voltInk : colors.ink}>{title}</Text>
    </Pressable>
  );
}

export function OutdoorShare({ record }: { record: OutdoorRecord }) {
  const svg = useRef<Svg>(null);
  const running = useRef(false);
  const [open, setOpen] = useState(false);
  const [story, setStory] = useState(true);
  const [model, setModel] = useState<OutdoorShareModel>('summary');
  const [showRoute, setShowRoute] = useState(true);
  const [action, setAction] = useState<'copy' | 'share' | null>(null);
  const [message, setMessage] = useState('');
  const [mark, setMark] = useState('');
  const [markError, setMarkError] = useState(false);
  const { width, height: windowHeight } = useWindowDimensions();
  const previewWidth = Math.max(1, Math.min(272, width - 40, windowHeight * 0.26));
  const height = story ? 640 : 450;
  const hasRoute = record.route.some((segment) => segment.length > 1);
  const selectedModel = model === 'route' && !hasRoute ? 'summary' : model;
  const busy = action !== null;

  async function exportImage(mode: 'copy' | 'share') {
    const artwork = svg.current;
    if (running.current || !artwork) return;
    running.current = true;
    setAction(mode);
    setMessage('');

    function renderPng(view: Svg) {
      const scale = Platform.OS === 'ios' ? PixelRatio.get() : 1;
      return new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('A imagem demorou para ser gerada.')), 8000);
        try {
          view.toDataURL((data) => {
            clearTimeout(timeout);
            if (data) resolve(data.replace(/\s/g, ''));
            else reject(new Error('A imagem veio vazia.'));
          }, { width: Math.round(1080 / scale), height: Math.round(height * 3 / scale) });
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
    }

    try {
      if (mode === 'copy') {
        await copyActivityPng(() => renderPng(artwork));
        setMessage('PNG copiado com fundo transparente.');
      } else {
        setMessage((await shareActivityPng(await renderPng(artwork))) ?? '');
      }
    } catch {
      setMessage(mode === 'copy'
        ? 'Não foi possível copiar. Use a opção de compartilhar ou baixar.'
        : 'Não foi possível exportar a imagem. Tente novamente.');
    } finally {
      running.current = false;
      setAction(null);
    }
  }

  async function openShare() {
    setOpen(true);
    if (mark) return;
    setMarkError(false);
    try {
      setMark(await loadActivityMark(BRAND_MARK_ASSET));
    } catch {
      setMarkError(true);
    }
  }

  function close() {
    if (running.current) return;
    setMessage('');
    setOpen(false);
  }

  if (!open) {
    return <Button title="Compartilhar atividade" icon={Share2} onPress={() => void openShare()} />;
  }

  const exportMode = activityPngExportMode();
  const canCopy = canCopyActivityPng();
  const exportTitle = { share: 'Compartilhar PNG', save: 'Salvar PNG', download: 'Baixar PNG' }[exportMode];

  return (
    <Modal animationType="slide" onRequestClose={close}>
      <Page
        topBar={<TopBar title="Compartilhar atividade"
          leading={<IconButton icon={X} label="Fechar compartilhamento" onPress={close} disabled={busy} />} />}
        contentStyle={{ gap: Spacing.four, maxWidth: 520, width: '100%', alignSelf: 'center' }}
        footer={(
          <View style={{ gap: Spacing.two, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
            {message !== '' && <Text variant="label" accessibilityLiveRegion="polite">{message}</Text>}
            {canCopy ? (
              <Button title="Copiar imagem" icon={Copy} size="lg" loading={action === 'copy'} disabled={busy || !mark}
                onPress={() => void exportImage('copy')} />
            ) : (
              <Text variant="caption">A cópia de imagens está indisponível nesta versão.</Text>
            )}
            <Button title={exportTitle} icon={exportMode === 'share' ? Share2 : Download} variant={canCopy ? 'soft' : 'primary'}
              loading={action === 'share'} disabled={busy || !mark} onPress={() => void exportImage('share')} />
          </View>
        )}>
        <Row style={{ flexWrap: 'wrap' }}>
          <Choice title="Story · 9:16" selected={story} disabled={busy} onPress={() => { setStory(true); setMessage(''); }} />
          <Choice title="Post · 4:5" selected={!story} disabled={busy} onPress={() => { setStory(false); setMessage(''); }} />
        </Row>
        <View style={{ gap: Spacing.two }}>
          <Text variant="titleSm">Modelo</Text>
          <Row style={{ flexWrap: 'wrap' }}>
            {outdoorShareModels.filter(({ id }) => id !== 'route' || hasRoute).map(({ id, label }) => (
              <Choice key={id} title={label} selected={selectedModel === id} disabled={busy}
                onPress={() => { setModel(id); setMessage(''); }} />
            ))}
          </Row>
        </View>
        <View style={{ alignItems: 'center', gap: Spacing.two }}>
          <View style={{ backgroundColor: '#22262a', borderRadius: Radius.md, overflow: 'hidden' }}>
            {mark ? (
              <Svg ref={svg} width={previewWidth} height={previewWidth * height / 360} viewBox={`0 0 360 ${height}`}
                accessibilityLabel="Prévia da imagem da atividade">
                <OutdoorShareArtwork model={selectedModel} record={record} height={height} showRoute={showRoute} mark={mark} />
              </Svg>
            ) : (
              <View style={{ width: previewWidth, height: previewWidth * height / 360, justifyContent: 'center', padding: Spacing.four }}>
                {markError
                  ? <Button title="Recarregar prévia" variant="soft" onPress={() => void openShare()} />
                  : <ActivityIndicator color="#fff" accessibilityLabel="Carregando prévia" />}
              </View>
            )}
          </View>
          <Text variant="caption">PNG com fundo transparente</Text>
        </View>
        {selectedModel === 'route' && (
          <Button title={showRoute ? 'Ocultar trajeto' : 'Mostrar trajeto'} variant="soft" disabled={busy}
            onPress={() => { setShowRoute(!showRoute); setMessage(''); }} />
        )}
      </Page>
    </Modal>
  );
}
