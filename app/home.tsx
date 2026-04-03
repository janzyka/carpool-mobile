import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import AddRideModal from '../src/components/AddRideModal';
import RequestsScreen from '../src/components/RequestsScreen';
import RidesScreen from '../src/components/RidesScreen';
import { useAuthStore } from '../src/store/authStore';
import { useIgnoredRidesStore } from '../src/store/ignoredRidesStore';
import { useMyInterestsStore } from '../src/store/myInterestsStore';
import { usePoiStore } from '../src/store/poiStore';
import { useRequestsStore } from '../src/store/requestsStore';
import { useRidesStore } from '../src/store/ridesStore';

type Tab = 'rides' | 'requests' | 'asks';

const TABS: { id: Tab; label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; title: string }[] = [
  { id: 'rides',    label: 'Rides',       icon: 'steering',            title: 'Rides' },
  { id: 'requests', label: 'Requests',    icon: 'human-handsup',       title: 'Requests' },
  { id: 'asks',     label: 'Asks',        icon: 'help-circle-outline', title: 'Asks' },
];

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('rides');
  const [showAddRide, setShowAddRide] = useState(false);
  const current = TABS.find((t) => t.id === activeTab)!;
  const { pois, syncPois } = usePoiStore();
  const { rides, loading: ridesLoading, error: ridesError, fetchRides } = useRidesStore();
  const { loadIgnored } = useIgnoredRidesStore();
  const fetchMyInterests = useMyInterestsStore((s) => s.fetchMyInterests);
  const currentUserId = useAuthStore((s) => s.userId);
  const { interests, loading: requestsLoading, error: requestsError, fetchRequests } = useRequestsStore();

  useFocusEffect(useCallback(() => {
    syncPois();
    fetchRides();
    loadIgnored();
    if (currentUserId) {
      fetchMyInterests(currentUserId);
      fetchRequests(currentUserId);
    }
  }, [syncPois, fetchRides, loadIgnored, fetchMyInterests, fetchRequests, currentUserId]));

  return (
    <SafeAreaView style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Fixed header ── */}
      <View style={styles.header}>
        <View style={styles.headerSide}>
          {activeTab === 'rides' && (
            <Pressable onPress={fetchRides} disabled={ridesLoading} hitSlop={12}>
              <MaterialCommunityIcons name="refresh" size={24} color={ridesLoading ? '#D1D5DB' : '#6B7280'} />
            </Pressable>
          )}
          {activeTab === 'requests' && (
            <Pressable onPress={() => currentUserId && fetchRequests(currentUserId)} disabled={requestsLoading} hitSlop={12}>
              <MaterialCommunityIcons name="refresh" size={24} color={requestsLoading ? '#D1D5DB' : '#6B7280'} />
            </Pressable>
          )}
        </View>
        <Text style={styles.headerTitle}>{current.title}</Text>
        <View style={styles.headerSide}>
          {activeTab === 'rides' && (
            <Pressable onPress={() => setShowAddRide(true)} hitSlop={12}>
              <MaterialCommunityIcons name="plus" size={26} color="#2563EB" />
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
      <View style={styles.content}>
        {activeTab === 'rides' && (
          <RidesScreen
            rides={rides}
            pois={pois}
            loading={ridesLoading}
            error={ridesError}
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
      </View>

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
                color={active ? '#2563EB' : '#9CA3AF'}
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
  root: { flex: 1, backgroundColor: '#fff' },

  header: {
    height: 56,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
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
    color: '#111827',
    letterSpacing: 0.2,
  },

  content: { flex: 1 },

  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 16, color: '#9CA3AF' },

  footer: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
});
