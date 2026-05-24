import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export const checkBiometricSupport = async () => {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return { compatible, enrolled };
};

export const authenticateWithBiometric = async () => {
  const { compatible, enrolled } = await checkBiometricSupport();
  if (!compatible || !enrolled) {
    return { success: false, reason: 'not_available' };
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock My Life OS',
    fallbackLabel: 'Use Passcode',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });

  return result;
};

export const hasSavedSession = async () => {
  const token = await SecureStore.getItemAsync('refreshToken');
  return !!token;
};
