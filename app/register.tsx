import * as ImagePicker from 'expo-image-picker';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { registerUser } from '../src/api/auth';
import { useAuthStore } from '../src/store/authStore';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setPendingRegistration } = useAuthStore();

  const pickIcon = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setIcon(result.assets[0].base64);
    }
  };

  const handleGo = async () => {
    if (!name.trim()) { Alert.alert('Please enter your name'); return; }
    if (!phoneNumber.trim()) { Alert.alert('Please enter your phone number'); return; }

    setLoading(true);
    try {
      const trimmedName = name.trim();
      const trimmedPhone = phoneNumber.trim();
      const data = await registerUser(trimmedName, trimmedPhone, icon ?? undefined);
      setPendingRegistration({ name: trimmedName, phoneNumber: trimmedPhone, icon: icon ?? undefined });
      router.push({ pathname: '/verify', params: { userId: String(data.id) } });
    } catch {
      Alert.alert('Registration failed', 'Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Welcome to Carpool</Text>
        <Text style={styles.subtitle}>Enter your details to get started</Text>

        <Pressable style={styles.avatarWrapper} onPress={pickIcon}>
          {icon ? (
            <Image source={{ uri: `data:image/jpeg;base64,${icon}` }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>Photo{'\n'}(optional)</Text>
            </View>
          )}
        </Pressable>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Your name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          returnKeyType="next"
        />

        <Text style={styles.label}>Phone number</Text>
        <TextInput
          style={styles.input}
          placeholder="+420 737 000 000"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          returnKeyType="done"
        />

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleGo}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Go</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1, padding: 28, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#6B7280', marginBottom: 32 },
  avatarWrapper: { alignSelf: 'center', marginBottom: 28 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#F3F4F6', borderWidth: 1.5,
    borderColor: '#D1D5DB', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarPlaceholderText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    height: 50, borderWidth: 1.5, borderColor: '#D1D5DB',
    borderRadius: 10, paddingHorizontal: 14, fontSize: 16,
    backgroundColor: '#F9FAFB', marginBottom: 18, color: '#111827',
  },
  button: {
    height: 52, backgroundColor: '#2563EB', borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
