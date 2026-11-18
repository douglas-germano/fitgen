export async function shareMessage(message: string) {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ text: message });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) throw error;
    }
    return;
  }

  await navigator.clipboard.writeText(message);
  window.alert('Convite copiado.');
}
