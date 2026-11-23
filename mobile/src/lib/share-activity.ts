import { requireOptionalNativeModule } from 'expo';
import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

export function activityPngExportMode(): 'share' | 'save' | 'download' {
  return Platform.OS === 'android' && !requireOptionalNativeModule('ExpoSharing') ? 'save' : 'share';
}

export function canCopyActivityPng() {
  return !!requireOptionalNativeModule('ExpoClipboard');
}

export async function shareActivityPng(png: string): Promise<string | undefined> {
  if (activityPngExportMode() === 'save') {
    let folder: Directory;
    try {
      folder = await Directory.pickDirectoryAsync();
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ERR_PICKER_CANCELLED') return;
      throw error;
    }
    const file = folder.createFile('fitgen-atividade.png', 'image/png');
    await file.write(png, { encoding: 'base64' });
    return `PNG salvo como ${file.name}. Abra o arquivo para compartilhar.`;
  }

  if (!requireOptionalNativeModule('ExpoSharing')) {
    throw new Error('O APK instalado não inclui o compartilhamento de imagens.');
  }
  const { isAvailableAsync, shareAsync } = await import('expo-sharing');
  if (!(await isAvailableAsync())) throw new Error('Compartilhamento indisponível neste aparelho.');

  const directory = new Directory(Paths.cache, 'outdoor-share');
  directory.create({ idempotent: true });
  const file = new File(directory, 'fitgen-atividade.png');
  await file.write(png, { encoding: 'base64' });
  await shareAsync(file.uri, { mimeType: 'image/png', UTI: 'public.png' });
}

export async function copyActivityPng(render: () => Promise<string>) {
  if (!canCopyActivityPng()) {
    throw new Error('O APK instalado não inclui a cópia de imagens.');
  }
  const { setImageAsync } = await import('expo-clipboard');
  await setImageAsync(await render());
}

export async function loadActivityMark(assetModule: number) {
  const asset = await Asset.fromModule(assetModule).downloadAsync();
  if (!asset.localUri) throw new Error('A marca do FitGen não está disponível.');
  return 'data:image/png;base64,' + await new File(asset.localUri).base64();
}
