import assert from 'node:assert/strict';
import test from 'node:test';
import { chatMessageKey, localChatMessage } from '../src/lib/chat.ts';

test('a sent message keeps its identity when the answer is appended and list order changes', () => {
  const user = localChatMessage('user', 'Como ajustar meu treino?', 1);
  const key = chatMessageKey(user, 0);
  const answer = localChatMessage('model', 'Resposta de teste', 2);
  assert.notEqual(answer.id, user.id);
  assert.equal(chatMessageKey([answer, user][1], 1), key);
  assert.equal(chatMessageKey({ ...user }, 10), key);
});

test('server messages keep their original ID without being marked as new local messages', () => {
  const server = { id: 'server-id', role: 'model', content: 'Histórico' };
  assert.equal(chatMessageKey(server, 0), 'server-id');
  assert.equal(chatMessageKey(server, 20), 'server-id');
  assert.equal(server.id.startsWith('local-'), false);
});
