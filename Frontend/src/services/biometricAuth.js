import * as LocalAuthentication from 'expo-local-authentication';

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
    fallbackLabel: 'Use PIN',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });

  return result;
};