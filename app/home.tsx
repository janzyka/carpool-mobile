import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const bgImage = require('../assets/background.png');
import AddRideModal from '../src/components/AddRideModal';
import HitchhikerSplash from '../src/components/HitchhikerSplash';
import RequestsScreen from '../src/components/RequestsScreen';
import RidesScreen from '../src/components/RidesScreen';
import { useAuthStore } from '../src/store/authStore';
import { useIgnoredRidesStore } from '../src/store/ignoredRidesStore';
import { useMyInterestsStore } from '../src/store/myInterestsStore';
import { usePoiStore } from '../src/store/poiStore';
import { useRequestsStore } from '../src/store/requestsStore';
import { useRidesStore } from '../src/store/ridesStore';

type Tab = 'rides' | 'requests' | 'asks';
type RideFilter = 'all' | 'mine' | 'others';

const FILTER_CYCLE: RideFilter[] = ['all', 'mine', 'others'];
const FILTER_LABELS: Record<RideFilter, string> = {
  all:    'All Rides',
  mine:   'My Rides',
  others: "Others' Rides",
};

const TABS: { id: Tab; label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; title: string }[] = [
  { id: 'rides',    label: 'Rides',       icon: 'steering',            title: 'Rides' },
  { id: 'requests', label: 'Requests',    icon: 'human-handsup',       title: 'Requests' },
  { id: 'asks',     label: 'Asks',        icon: 'help-circle-outline', title: 'Asks' },
];

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('rides');
  const [showAddRide, setShowAddRide] = useState(false);
  const [rideFilter, setRideFilter] = useState<RideFilter>('all');
  const [dataReady, setDataReady] = useState(false);
  const hasLoaded = useRef(false);
  const current = TABS.find((t) => t.id === activeTab)!;

  function cycleFilter() {
    setRideFilter((f) => FILTER_CYCLE[(FILTER_CYCLE.indexOf(f) + 1) % FILTER_CYCLE.length]);
  };
  const { pois, syncPois } = usePoiStore();
  const { rides, loading: ridesLoading, error: ridesError, fetchRides } = useRidesStore();
  const { loadIgnored } = useIgnoredRidesStore();
  const fetchMyInterests = useMyInterestsStore((s) => s.fetchMyInterests);
  const currentUserId = useAuthStore((s) => s.userId);
  const { interests, loading: requestsLoading, error: requestsError, fetchRequests } = useRequestsStore();

  useFocusEffect(useCallback(() => {
    const load = async () => {
      await Promise.all([
        syncPois(),
        fetchRides(),
        loadIgnored(),
        currentUserId ? fetchMyInterests(currentUserId) : Promise.resolve(),
        currentUserId ? fetchRequests(currentUserId) : Promise.resolve(),
      ]);
      if (!hasLoaded.current) {
        hasLoaded.current = true;
        setDataReady(true);
      }
    };
    load();
  }, [syncPois, fetchRides, loadIgnored, fetchMyInterests, fetchRequests, currentUserId]));

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
            <Pressable onPress={fetchRides} disabled={ridesLoading} hitSlop={12}>
              <MaterialCommunityIcons name="refresh" size={24} color={ridesLoading ? 'rgba(61,53,48,0.3)' : '#3D3530'} />
            </Pressable>
          )}
          {activeTab === 'requests' && (
            <Pressable onPress={() => currentUserId && fetchRequests(currentUserId)} disabled={requestsLoading} hitSlop={12}>
              <MaterialCommunityIcons name="refresh" size={24} color={requestsLoading ? 'rgba(61,53,48,0.3)' : '#3D3530'} />
            </Pressable>
          )}
        </View>
        {activeTab === 'rides' ? (
          <Pressable style={styles.filterButton} onPress={cycleFilter} hitSlop={8}>
            <MaterialCommunityIcons name="swap-vertical" size={18} color="rgba(61,53,48,0.6)" />
            <Text style={styles.filterLabel}>{FILTER_LABELS[rideFilter]}</Text>
          </Pressable>
        ) : (
          <Text style={styles.headerTitle}>{current.title}</Text>
        )}
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
        onCreated={() => setShowAddRide(false)}
      />

      {/* ── Page content ── */}
      <ImageBackground source={bgImage} style={styles.content} resizeMode="cover">
        {activeTab === 'rides' && (
          <RidesScreen
            rides={rides}
            pois={pois}
            loading={ridesLoading}
            error={ridesError}
            filter={rideFilter}
            currentUserId={currentUserId}
          />
        )}
        {activeTab === 'requests' && (
          <RequestsScreen
            interests={interests}
            rides={rides}
            pois={pois}
            loading={requestsLoading}
            error={requestsError}
          />
        )}
        {activeTab === 'asks'     && <PlaceholderPage label="Asks" />}
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
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  filterLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3D3530',
    letterSpacing: 0.2,
  },
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
