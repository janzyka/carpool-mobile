import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { verifyUser } from '../src/api/auth';
import OtpInput from '../src/components/OtpInput';
import { useAuthStore } from '../src/store/authStore';

export default function VerifyScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleComplete = async (code: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const data = await verifyUser(Number(userId), Number(code));
      await setAuth(data.authKey, Number(userId));
      router.replace('/home');
    } catch {
      Alert.alert('Incorrect code', 'The verification code is wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify your number</Text>
      <Text style={styles.subtitle}>
        Enter the 6-digit code we sent to your phone.
      </Text>
      <OtpInput onComplete={handleComplete} disabled={loading} />
      {loading && <Text style={styles.checking}>Checking…</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', padding: 28,
  },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: {
    fontSize: 15, color: '#6B7280', textAlign: 'center',
    marginBottom: 36, lineHeight: 22,
  },
  checking: { marginTop: 20, fontSize: 14, color: '#6B7280' },
});
