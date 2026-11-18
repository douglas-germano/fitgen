if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((error) => {
    console.error('FitGen: falha ao registrar service worker.', error);
  });
}
