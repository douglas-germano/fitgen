import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

type LiveActivityModule = {
  publish(
    id: string, title: string, kind: string, timerStart: number | null,
    elapsed: string, distance: string, rate: string, start: boolean,
  ): Promise<boolean>;
  publishWorkout(
    id: string, title: string, detail: string, progress: string,
    timerStart: number, restEnd: number | null, url: string, start: boolean,
  ): Promise<void>;
  end(id: string): Promise<void>;
};

export const liveActivity = Platform.OS === 'ios' || Platform.OS === 'android'
  ? requireOptionalNativeModule<LiveActivityModule>('OutdoorLive')
  : null;
