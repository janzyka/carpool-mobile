import '../src/i18n'; // initialise i18next before any screen renders
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

console.log('[env] EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack />
    </GestureHandlerRootView>
  );
}
