// Native Google / Apple sign-in. Each returns the provider's id_token (or null when the user cancels);
// the backend (/auth/social) verifies it and issues our own session tokens.
import { GoogleSignin, isCancelledResponse, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type SocialProvider = 'google' | 'apple';

/** A sign-in failure whose message is already written for the user. */
export class SocialSignInError extends Error {
  name = 'SocialSignInError';
}

// Android GoogleSignInStatusCodes / CommonStatusCodes that point at setup, network or the account.
const GOOGLE_ERRORS: Record<string, string> = {
  '10': 'Este app não está autorizado a usar o login do Google. Tente outro método de login.',
  '7': 'Sem conexão com o Google. Verifique a rede e tente novamente.',
  '12500': 'O Google não conseguiu concluir o login. Tente novamente.',
};
export type SocialCredential = { provider: SocialProvider; idToken: string; name?: string };

const extra = (Constants.expoConfig?.extra ?? {}) as {
  googleWebClientId?: string;
  googleIosClientId?: string;
  appleSignIn?: boolean;
};

let googleConfigured = false;
function configureGoogle() {
  if (googleConfigured) return;
  // The Web client id makes Google mint an id_token for our backend (aud = web client) on both platforms.
  GoogleSignin.configure({ webClientId: extra.googleWebClientId, iosClientId: extra.googleIosClientId });
  googleConfigured = true;
}

export const googleSignInEnabled = Platform.OS !== 'web' && !!extra.googleWebClientId;

/** Apple needs the paid-account entitlement; free-signing dev builds turn it off in app.config.js. */
export async function appleSignInAvailable() {
  if (Platform.OS !== 'ios' || extra.appleSignIn === false) return false;
  return AppleAuthentication.isAvailableAsync().catch(() => false);
}

export async function googleCredential(): Promise<SocialCredential | null> {
  configureGoogle();
  try {
    if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Always show the account picker instead of silently reusing the last account.
    await GoogleSignin.signOut().catch(() => undefined);
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) return null;
    const { idToken, user } = response.data;
    if (!idToken) throw new SocialSignInError('O Google não retornou o token de login.');
    return { provider: 'google', idToken, name: user.name ?? undefined };
  } catch (e) {
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.IN_PROGRESS || e.code === statusCodes.SIGN_IN_CANCELLED) return null;
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new SocialSignInError('Atualize o Google Play Services para entrar com o Google.');
      }
      const message = GOOGLE_ERRORS[String(e.code)];
      if (message) throw new SocialSignInError(message);
    }
    throw e;
  }
}

export async function appleCredential(): Promise<SocialCredential | null> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) throw new SocialSignInError('A Apple não retornou o token de login.');
    // Apple only shares the name on the very first sign-in, so forward it to the backend.
    const name = credential.fullName
      ? AppleAuthentication.formatFullName(credential.fullName).trim() || undefined
      : undefined;
    return { provider: 'apple', idToken: credential.identityToken, name };
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
    throw e;
  }
}
