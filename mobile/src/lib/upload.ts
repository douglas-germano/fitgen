import { File } from 'expo-file-system';

/**
 * A picked/captured image ready for `FormData.append`.
 *
 * Expo's fetch (the global `fetch` in this app) cannot send React Native's
 * `{ uri, name, type }` parts: it throws "Unsupported FormDataPart implementation"
 * before any request leaves the device. `File` implements Blob, so it uploads.
 */
export function uploadableFile(uri: string): File {
  return new File(uri);
}
