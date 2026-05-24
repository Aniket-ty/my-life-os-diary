import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import FloatingAIButton from './FloatingAIButton';
import GlobalAISheet from './GlobalAISheet';

export default function withAI(WrappedScreen, context = 'general', getContextData = () => ({})) {
  return function AIWrappedScreen(props) {
    const sheetRef = useRef(null);

    const openAI = () => {
      sheetRef.current?.expand();
    };

    return (
      <View style={styles.container}>
        <WrappedScreen {...props} openAI={openAI} />
        <FloatingAIButton onPress={openAI} />
        <GlobalAISheet
          sheetRef={sheetRef}
          context={context}
          contextData={getContextData(props)}
        />
      </View>
    );
  };
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
