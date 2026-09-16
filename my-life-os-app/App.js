import 'react-native-gesture-handler'; // 👈 VERY IMPORTANT (keep at top)

import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { useAuthStore } from './src/stores/authStore';
import Navigation from './src/navigation';
import { authenticateWithBiometric, hasSavedSession } from './src/services/biometricAuth';
import { colors } from './src/theme';

export default function App() {
  const { init, isLoading } = useAuthStore();
  const [biometricChecked, setBiometricChecked] = useState(false);

  useEffect(() => {
    startup();
  }, []);

  const startup = async () => {
    const hasSession = await hasSavedSession();
    console.log('Has saved session:', hasSession);

    if (hasSession) {
      const result = await authenticateWithBiometric();
      console.log('Biometric result:', JSON.stringify(result));

      if (result.success) {
        await init();
      } else if (result.reason === 'not_available') {
        await init();
      } else {
        await init();
      }
    } else {
      await init();
    }

    setBiometricChecked(true);
  };

  if (isLoading || !biometricChecked) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.void }}>
          <ActivityIndicator size="large" color={colors.violet} />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <Navigation />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}