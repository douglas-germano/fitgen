import type { AlertButton, AlertOptions } from 'react-native';

export type FeedbackAction = {
  label: string;
  style?: AlertButton['style'];
  disabled?: boolean;
  run?: () => void;
};
export type FeedbackRequest = {
  id: number;
  scope: string;
  kind: 'alert' | 'menu';
  title: string;
  message?: string;
  actions: FeedbackAction[];
  cancelable: boolean;
  onDismiss?: () => void;
};

let sequence = 0;
let queue: FeedbackRequest[] = [];
let scopes: string[] = [];
const listeners = new Set<() => void>();
const dismissers = new Map<string, () => void>();
const emit = () => listeners.forEach((listener) => listener());

export const feedbackSnapshot = () => queue[0] ?? null;
export function subscribeFeedback(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Feedback belongs to the top open sheet, so it never competes with another native modal. */
export function registerFeedbackScope(scope: string) {
  scopes = [...scopes, scope];
  return () => {
    scopes = scopes.filter((entry) => entry !== scope);
    queue = queue.map((request) => request.scope === scope ? { ...request, scope: scopes.at(-1) ?? 'root' } : request);
    emit();
  };
}

export function installFeedbackDismiss(scope: string, dismiss: () => void) {
  dismissers.set(scope, dismiss);
  return () => { if (dismissers.get(scope) === dismiss) dismissers.delete(scope); };
}
export function dismissFeedbackInScope(scope: string) {
  if (feedbackSnapshot()?.scope !== scope) return false;
  dismissers.get(scope)?.();
  return true;
}

function enqueue(request: Omit<FeedbackRequest, 'id' | 'scope'>) {
  queue = [...queue, { ...request, id: ++sequence, scope: scopes.at(-1) ?? 'root' }];
  emit();
}

/** Called after the exit animation. Returning the action keeps presentation and effects separate. */
export function completeFeedback(id: number, index: number | null): (() => void) | undefined {
  const request = feedbackSnapshot();
  if (!request || request.id !== id) return;
  queue = queue.slice(1);
  emit();
  return index === null
    ? request.actions.find((action) => action.style === 'cancel')?.run ?? request.onDismiss
    : request.actions[index]?.run;
}

export const AppAlert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
    enqueue({ kind: 'alert', title, message, cancelable: options?.cancelable ?? true, onDismiss: options?.onDismiss,
      actions: (buttons?.length ? buttons : [{ text: 'OK' }]).map((button) => ({ label: button.text ?? 'OK', style: button.style, run: button.onPress ? () => button.onPress?.() : undefined })),
    });
  },
};

export const AppActionSheet = {
  showActionSheetWithOptions(options: {
    title?: string;
    message?: string;
    options: string[];
    cancelButtonIndex?: number;
    destructiveButtonIndex?: number | number[];
    disabledButtonIndices?: number[];
  }, callback: (index: number) => void) {
    const destructive = Array.isArray(options.destructiveButtonIndex) ? options.destructiveButtonIndex : [options.destructiveButtonIndex];
    enqueue({ kind: 'menu', title: options.title ?? 'Mais opções', message: options.message, cancelable: true,
      actions: options.options.map((label, index) => ({ label,
        style: index === options.cancelButtonIndex ? 'cancel' : destructive.includes(index) ? 'destructive' : 'default',
        disabled: options.disabledButtonIndices?.includes(index), run: () => callback(index),
      })),
    });
  },
};
