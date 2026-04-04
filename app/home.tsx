import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const bgImage = require('../assets/background.png');
import AddRideModal from '../src/components/AddRideModal';
import HitchhikerSplash from '../src/components/HitchhikerSplash';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { patchUser } from '../src/api/users';

const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

// Show notifications as banners while the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
import ProfileScreen from '../src/components/ProfileScreen';
import RequestsScreen from '../src/components/RequestsScreen';
import RidesScreen from '../src/components/RidesScreen';
import { useAuthStore } from '../src/store/authStore';
import { useIgnoredRidesStore } from '../src/store/ignoredRidesStore';
import { useMyInterestsStore } from '../src/store/myInterestsStore';
import { usePoiStore } from '../src/store/poiStore';
import { useRequestsStore } from '../src/store/requestsStore';
import { useRidesStore } from '../src/store/ridesStore';
import { useVehiclesStore } from '../src/store/vehiclesStore';

type Tab = 'rides' | 'requests' | 'profile';

const TABS: { id: Tab; label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; title: string }[] = [
  { id: 'rides',    label: 'Rides',    icon: 'steering',       title: 'Rides' },
  { id: 'requests', label: 'Requests', icon: 'human-handsup',  title: 'Requests' },
  { id: 'profile',  label: 'Profile',  icon: 'account-circle', title: 'Profile' },
];

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('rides');
  const [showAddRide, setShowAddRide] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const hasLoaded = useRef(false);
  const current = TABS.find((t) => t.id === activeTab)!;
  const { pois, syncPois } = usePoiStore();
  const { rides, loading: ridesLoading, error: ridesError, fetchRides } = useRidesStore();
  const { loadIgnored } = useIgnoredRidesStore();
  const fetchMyInterests = useMyInterestsStore((s) => s.fetchMyInterests);
  const currentUserId = useAuthStore((s) => s.userId);
  const { fetchRequests } = useRequestsStore();
  const fetchVehicles = useVehiclesStore((s) => s.fetchVehicles);

  // Register push token once per session, re-runs if userId changes (e.g. after login).
  useEffect(() => {
    if (!currentUserId || IS_EXPO_GO) {
      if (IS_EXPO_GO) console.log('[push] skipped — not supported in Expo Go on Android');
      return;
    }
    (async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          console.log('[push] permission denied');
          return;
        }
        const token = await Notifications.getExpoPushTokenAsync();
        console.log('[push] token:', token.data);
        await patchUser(currentUserId, { pushToken: token.data });
      } catch (e) {
        console.warn('[push] token registration failed:', e);
      }
    })();
  }, [currentUserId]);

  // Foreground notification listener — trigger the relevant pull.
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as { type?: string };
      console.log('[push] received:', data);
      if (data?.type === 'new_ride') {
        fetchRides();
        if (currentUserId) fetchMyInterests(currentUserId);
      } else if (data?.type === 'new_interest' && currentUserId) {
        fetchRequests(currentUserId);
      } else if (data?.type === 'interest_response' && currentUserId) {
        fetchMyInterests(currentUserId);
      }
    });
    return () => subscription.remove();
  }, [currentUserId, fetchRequests, fetchMyInterests]);

  useFocusEffect(useCallback(() => {
    const load = async () => {
      await Promise.all([
        syncPois(),
        fetchRides(),
        loadIgnored(),
        currentUserId ? fetchMyInterests(currentUserId) : Promise.resolve(),
        currentUserId ? fetchRequests(currentUserId) : Promise.resolve(),
        currentUserId ? fetchVehicles(currentUserId) : Promise.resolve(),
      ]);
      if (!hasLoaded.current) {
        hasLoaded.current = true;
        setDataReady(true);
      }
    };
    load();
  }, [syncPois, fetchRides, loadIgnored, fetchMyInterests, fetchRequests, fetchVehicles, currentUserId]));

  if (!dataReady) {
    return (
      <SafeAreaView style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <HitchhikerSplash />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Fixed header ── */}
      <View style={styles.header}>
        <View style={styles.headerSide}>
          {activeTab === 'rides' && (
            <Pressable
              onPress={() => { fetchRides(); if (currentUserId) fetchRequests(currentUserId); }}
              disabled={ridesLoading}
              hitSlop={12}
            >
              <MaterialCommunityIcons name="refresh" size={24} color={ridesLoading ? 'rgba(61,53,48,0.3)' : '#3D3530'} />
            </Pressable>
          )}
          {activeTab === 'requests' && (
            <Pressable
              onPress={() => { fetchRides(); if (currentUserId) fetchMyInterests(currentUserId); }}
              disabled={ridesLoading}
              hitSlop={12}
            >
              <MaterialCommunityIcons name="refresh" size={24} color={ridesLoading ? 'rgba(61,53,48,0.3)' : '#3D3530'} />
            </Pressable>
          )}
        </View>
        <Text style={styles.headerTitle}>{current.title}</Text>
        <View style={styles.headerSide}>
          {activeTab === 'rides' && (
            <Pressable onPress={() => setShowAddRide(true)} hitSlop={12}>
              <MaterialCommunityIcons name="plus" size={26} color="#3D3530" />
            </Pressable>
          )}
        </View>
      </View>

      <AddRideModal
        visible={showAddRide}
        pois={pois}
        onClose={() => setShowAddRide(false)}
        onCreated={() => { setShowAddRide(false); fetchRides(); }}
      />

      {/* ── Page content ── */}
      <ImageBackground source={bgImage} style={styles.content} resizeMode="cover">
        {activeTab === 'rides' && (
          <RidesScreen
            rides={rides}
            pois={pois}
            loading={ridesLoading}
            error={ridesError}
            currentUserId={currentUserId}
          />
        )}
        {activeTab === 'requests' && (
          <RequestsScreen
            rides={rides}
            pois={pois}
            loading={ridesLoading}
            error={ridesError}
            currentUserId={currentUserId}
          />
        )}
        {activeTab === 'profile'  && <ProfileScreen currentUserId={currentUserId} />}
      </ImageBackground>

      {/* ── Fixed footer tab bar ── */}
      <View style={styles.footer}>
        {TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <Pressable
              key={tab.id}
              style={styles.tabButton}
              onPress={() => setActiveTab(tab.id)}
            >
              <MaterialCommunityIcons
                name={tab.icon}
                size={26}
                color={active ? '#3D3530' : 'rgba(61,53,48,0.4)'}
              />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function PlaceholderPage({ label }: { label: string }) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E8E2DC' },

  header: {
    height: 56,
    backgroundColor: '#E8E2DC',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerSide: { width: 40 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#3D3530',
    letterSpacing: 0.2,
  },

  content: { flex: 1 },

  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 16, color: '#9CA3AF' },

  footer: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: '#E8E2DC',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.15)',
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
    color: 'rgba(61,53,48,0.4)',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#3D3530',
    fontWeight: '600',
  },
});
