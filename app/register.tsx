import * as AppleAuthentication from 'expo-apple-authentication';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GoogleSignin, GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { socialLogin } from '../src/api/auth';
import { useAuthStore } from '../src/store/authStore';
import { useAsksStore } from '../src/store/asksStore';
import { useRidesStore } from '../src/store/ridesStore';
import { useRequestsStore } from '../src/store/requestsStore';
import { useVehiclesStore } from '../src/store/vehiclesStore';
import { useMyInterestsStore } from '../src/store/myInterestsStore';
import { useAskInterestsStore } from '../src/store/askInterestsStore';
// Configure Google Sign-In once.
GoogleSignin.configure({
  iosClientId: '971278551355-62t0ol7n67ol3048iu2j5t7cjo2rict9.apps.googleusercontent.com',
  webClientId: '971278551355-hpe1qvo5c2g4bt2rv3sp4cv96pbpjj41.apps.googleusercontent.com',
});

export default function RegisterScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();

  function resetStores() {
    useAsksStore.getState().reset();
    useRidesStore.getState().reset();
    useRequestsStore.getState().reset();
    useVehiclesStore.getState().reset();
    useMyInterestsStore.getState().reset();
    useAskInterestsStore.getState().reset();
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) throw new Error('No ID token from Google');
      const result = await socialLogin('google', idToken);
      resetStores();
      await setAuth(result.authKey, result.userId);
      router.replace(result.isNewUser ? { pathname: '/home', params: { initialTab: 'profile' } } : '/home');
    } catch (err: any) {
      console.error('[Google] sign-in error:', JSON.stringify(err), err?.message, err?.code);
      if (err?.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert(t('login.failed_title'), t('login.failed_message'));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleSignIn() {
    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('No identity token from Apple');
      // Apple only sends fullName on the very first sign-in; persist it for display.
      const name = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean).join(' ') || undefined;
      const result = await socialLogin('apple', credential.identityToken, name);
      resetStores();
      await setAuth(result.authKey, result.userId);
      router.replace(result.isNewUser ? { pathname: '/home', params: { initialTab: 'profile' } } : '/home');
    } catch (err: any) {
      if (err?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert(t('login.failed_title'), t('login.failed_message'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <Text style={styles.title}>Jedu</Text>
      <Text style={styles.subtitle}>{t('login.subtitle')}</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#3D3530" style={styles.spinner} />
      ) : (
        <View style={styles.buttons}>
          <GoogleSigninButton
            style={styles.googleButton}
            size={GoogleSigninButton.Size.Wide}
            color={GoogleSigninButton.Color.Dark}
            onPress={handleGoogleSignIn}
          />

          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={8}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#E8E2DC',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  title: { fontSize: 48, fontWeight: '800', color: '#3D3530', letterSpacing: -1, marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B7280', marginBottom: 56, textAlign: 'center' },
  spinner: { marginTop: 32 },
  buttons: { gap: 16, width: '100%', alignItems: 'center' },
  googleButton: { width: 240, height: 48 },
  appleButton: { width: 240, height: 48 },
});
