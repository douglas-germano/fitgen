import { Share } from 'react-native';

export const shareMessage = (message: string) => Share.share({ message });
