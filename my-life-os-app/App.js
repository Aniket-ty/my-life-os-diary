import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from './src/stores/authStore';
import Navigation from './src/navigation';

export default function App() {
  const { init, isLoading } = useAuthStore();

  useEffect(() => {
    init();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#085041" />
      </View>
    );
  }

  return <Navigation />;
}
