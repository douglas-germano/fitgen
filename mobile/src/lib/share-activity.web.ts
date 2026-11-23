import { Asset } from 'expo-asset';

export function activityPngExportMode(): 'share' | 'save' | 'download' {
  return 'download';
}

export function canCopyActivityPng() {
  return typeof navigator !== 'undefined' && !!navigator.clipboard?.write && typeof ClipboardItem !== 'undefined';
}

export async function shareActivityPng(png: string): Promise<undefined> {
  const link = document.createElement('a');
  link.href = 'data:image/png;base64,' + png;
  link.download = 'fitgen-atividade.png';
  link.click();
  return undefined;
}

export async function copyActivityPng(render: () => Promise<string>) {
  if (!canCopyActivityPng()) {
    throw new Error('Cópia de imagens indisponível neste navegador.');
  }

  // WebKit requires write() to begin during the tap, before rendering finishes.
  const png = render().then((data) => {
    const bytes = Uint8Array.from(atob(data), (character) => character.charCodeAt(0));
    return new Blob([bytes], { type: 'image/png' });
  });
  await Promise.all([navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]), png]);
}

export async function loadActivityMark(assetModule: number) {
  const response = await fetch(Asset.fromModule(assetModule).uri);
  if (!response.ok) throw new Error('A marca do FitGen não está disponível.');

  const image = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(image);
  });
}
