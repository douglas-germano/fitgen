import { X } from 'lucide-react-native';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { Motion } from '@/constants/motion';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';
import { completeFeedback, dismissFeedbackInScope, feedbackSnapshot, installFeedbackDismiss, subscribeFeedback, AppAlert, type FeedbackRequest } from '@/lib/feedback';

/** Low-level overlay: intentionally independent of ui.tsx so sheets can host their own feedback. */
function FeedbackSurface({ request }: { request: FeedbackRequest }) {
  const Colors = useColors();
  const [progress] = useState(() => new Animated.Value(0));
  const [closing, setClosing] = useState(false);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: reducedMotion ? 0 : Motion.message, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    return () => progress.stopAnimation();
  }, [progress, reducedMotion]);

  const dismiss = useCallback((index: number | null) => {
    if (closing || (index === null && !request.cancelable)) return;
    setClosing(true);
    Animated.timing(progress, { toValue: 0, duration: reducedMotion ? 0 : Motion.feedback, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return;
      const action = completeFeedback(request.id, index);
      if (action) requestAnimationFrame(() => {
        try { Promise.resolve(action()).catch(() => AppAlert.alert('Não foi possível concluir', 'Tente novamente em instantes.')); }
        catch { AppAlert.alert('Não foi possível concluir', 'Tente novamente em instantes.'); }
      });
    });
  }, [closing, progress, reducedMotion, request]);
  useEffect(() => installFeedbackDismiss(request.scope, () => dismiss(null)), [request.scope, dismiss]);

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]} accessibilityViewIsModal>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.scrim, opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => dismiss(null)} accessibilityLabel="Fechar aviso" accessibilityRole="button" disabled={!request.cancelable || closing} />
      </Animated.View>
      <KeyboardAvoidingView pointerEvents="box-none" style={{ flex: 1, justifyContent: 'center', padding: Spacing.five }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={{ width: '100%', maxWidth: 420, maxHeight: '90%', alignSelf: 'center', padding: Spacing.five, borderRadius: Radius.lg, backgroundColor: Colors.surface, gap: Spacing.four, opacity: progress, transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: reducedMotion ? [1, 1] : [0.98, 1] }) }] }}>
          <View>
            {/* Symmetric side padding keeps the title centered whether or not the close button is shown. */}
            <Text accessibilityRole="header" style={{ textAlign: 'center', fontFamily: Fonts.bold, color: Colors.ink, fontSize: 20, lineHeight: 27, paddingHorizontal: request.cancelable ? 40 : 0 }}>{request.title}</Text>
            {request.cancelable && <Pressable accessibilityRole="button" accessibilityLabel="Fechar aviso" disabled={closing} onPress={() => dismiss(null)} hitSlop={8} style={{ position: 'absolute', top: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceChip, alignItems: 'center', justifyContent: 'center' }}><X size={18} color={Colors.ink} /></Pressable>}
          </View>
          {!!request.message && <Text style={{ textAlign: 'center', color: Colors.inkMuted, fontFamily: Fonts.regular, fontSize: 14, lineHeight: 21 }}>{request.message}</Text>}
          <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" bounces={false} contentContainerStyle={{ gap: Spacing.two }}>
            {request.actions.map((action, index) => {
              const cancel = action.style === 'cancel';
              // The close button (and tapping outside) already cancels: a "Cancelar" button would repeat it.
              if (cancel && request.cancelable) return null;
              const destructive = action.style === 'destructive';
              const primary = request.kind === 'alert' && !cancel && !destructive;
              return <Pressable key={index} disabled={closing || action.disabled} accessibilityRole="button" accessibilityLabel={action.label} accessibilityState={{ disabled: closing || !!action.disabled }} onPress={() => dismiss(index)}
                style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: destructive ? Colors.dangerSoft : primary ? (pressed ? Colors.voltStrong : Colors.volt) : pressed ? Colors.line : Colors.surfaceChip, opacity: action.disabled ? 0.45 : 1 })}>
                <Text style={{ textAlign: 'center', color: destructive ? Colors.danger : primary ? Colors.onVolt : Colors.ink, fontFamily: Fonts.semibold, fontSize: 14, lineHeight: 20 }}>{action.label}</Text>
              </Pressable>;
            })}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Existing native sheets render feedback inside their own modal surface. */
export function FeedbackLayer({ scope }: { scope: string }) {
  const request = useSyncExternalStore(subscribeFeedback, feedbackSnapshot, feedbackSnapshot);
  return request?.scope === scope ? <FeedbackSurface key={request.id} request={request} /> : null;
}

export function FeedbackRoot() {
  const request = useSyncExternalStore(subscribeFeedback, feedbackSnapshot, feedbackSnapshot);
  if (!request || request.scope !== 'root') return null;
  return <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => { dismissFeedbackInScope('root'); }}>
    <FeedbackSurface key={request.id} request={request} />
  </Modal>;
}
