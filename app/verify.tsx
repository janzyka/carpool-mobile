import { registerUser, verifyUser } from '../src/api/auth';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import OtpInput from '../src/components/OtpInput';
import { useAuthStore } from '../src/store/authStore';

export default function VerifyScreen() {
  const { userId: initialUserId } = useLocalSearchParams<{ userId: string }>();
  const { setAuth, pendingRegistration, clearPendingRegistration } = useAuthStore();
  const [userId, setUserId] = useState(initialUserId);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [otpKey, setOtpKey] = useState(0);

  const handleComplete = async (code: string) => {
    if (verifying || resending) return;
    setVerifying(true);
    try {
      const data = await verifyUser(Number(userId), Number(code));
      await setAuth(data.authKey, Number(userId));
      clearPendingRegistration();
      router.replace('/home');
    } catch {
      Alert.alert('Incorrect code', 'The verification code is wrong. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (verifying || resending || !pendingRegistration) return;
    setResending(true);
    try {
      const data = await registerUser(
        pendingRegistration.name,
        pendingRegistration.phoneNumber,
        pendingRegistration.icon,
      );
      setUserId(String(data.id));
      setOtpKey((k) => k + 1);
    } catch {
      Alert.alert('Failed to resend', 'Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={styles.title}>Verify your number</Text>
      <Text style={styles.subtitle}>
        Enter the 6-digit code we sent to your phone.
      </Text>
      <OtpInput key={otpKey} onComplete={handleComplete} disabled={verifying || resending} />
      {verifying && <Text style={styles.status}>Checking…</Text>}
      {resending && <Text style={styles.status}>Sending new code…</Text>}
      {!verifying && !resending && (
        <Pressable onPress={handleResend} style={styles.resendButton}>
          <Text style={styles.resendText}>Resend code</Text>
        </Pressable>
      )}
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
  status: { marginTop: 20, fontSize: 14, color: '#6B7280' },
  resendButton: { marginTop: 28, padding: 8 },
  resendText: { fontSize: 15, color: '#2563EB', fontWeight: '600' },
});
