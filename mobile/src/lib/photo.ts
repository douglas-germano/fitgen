import { centerCropRect, FEED_JPEG_QUALITY, FEED_MAX_WIDTH, imageAspect } from '@/lib/community';
import type { ImageRatio } from '@/types/api';

/**
 * Prepares a feed photo like Instagram does before sending it: cropped to the chosen
 * format (4:5 or 9:16), at most 1080 px wide, JPEG at 80%. A multi-MB camera photo becomes
 * a few hundred KB, so posting is fast. The server re-encodes it again as the final authority,
 * so if anything fails here the original is sent as is.
 */
export async function prepareFeedPhoto(uri: string, ratio: ImageRatio): Promise<string> {
  try {
    // Loaded on demand: a build without this native module still runs (the server re-encodes anyway).
    const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');
    // Decode once to learn the real (already oriented) size.
    const source = await ImageManipulator.manipulate(uri).renderAsync();
    const crop = centerCropRect(source.width, source.height, imageAspect(ratio));
    if (!crop) return uri;
    const context = ImageManipulator.manipulate(source).crop(crop);
    if (crop.width > FEED_MAX_WIDTH) context.resize({ width: FEED_MAX_WIDTH, height: null });
    const result = await (await context.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: FEED_JPEG_QUALITY });
    return result.uri;
  } catch (error) {
    console.warn('Feed photo preparation failed; sending the original', error);
    return uri;
  }
}
