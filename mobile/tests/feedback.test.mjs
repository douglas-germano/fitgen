import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { AppActionSheet, AppAlert, completeFeedback, feedbackSnapshot, registerFeedbackScope } from '../src/lib/feedback.ts';

afterEach(() => {
  while (feedbackSnapshot()) completeFeedback(feedbackSnapshot().id, null);
});

test('a destructive action runs only after the popup has finished dismissing', () => {
  let removed = false;
  AppAlert.alert('Excluir?', 'Revise a ação.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Excluir', style: 'destructive', onPress: () => { removed = true; } },
  ]);
  const current = feedbackSnapshot();
  assert.equal(removed, false);
  const action = completeFeedback(current.id, 1);
  assert.equal(removed, false);
  assert.equal(feedbackSnapshot(), null);
  action();
  assert.equal(removed, true);
  assert.equal(completeFeedback(current.id, 1), undefined);
});

test('feedback is hosted by the top sheet and moves to its parent if that sheet closes', () => {
  const closeParent = registerFeedbackScope('parent');
  const closeChild = registerFeedbackScope('child');
  AppAlert.alert('Erro de validação');
  assert.equal(feedbackSnapshot().scope, 'child');
  closeChild();
  assert.equal(feedbackSnapshot().scope, 'parent');
  closeParent();
  assert.equal(feedbackSnapshot().scope, 'root');
});

test('action menus preserve cancellation and destructive action semantics', () => {
  let selected;
  AppActionSheet.showActionSheetWithOptions({ options: ['Remover', 'Cancelar'], destructiveButtonIndex: 0, cancelButtonIndex: 1 }, (index) => { selected = index; });
  const menu = feedbackSnapshot();
  assert.equal(menu.kind, 'menu');
  assert.equal(menu.actions[0].style, 'destructive');
  assert.equal(menu.actions[1].style, 'cancel');
  const cancel = completeFeedback(menu.id, null);
  cancel();
  assert.equal(selected, 1);
});

test('concurrent feedback stays in order and stale completions cannot dismiss the next alert', () => {
  AppAlert.alert('Primeiro');
  const first = feedbackSnapshot();
  AppAlert.alert('Segundo');
  assert.equal(feedbackSnapshot().title, 'Primeiro');
  completeFeedback(first.id, 0);
  assert.equal(feedbackSnapshot().title, 'Segundo');
  completeFeedback(first.id, 0);
  assert.equal(feedbackSnapshot().title, 'Segundo');
});
