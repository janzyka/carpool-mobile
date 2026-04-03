import { useEffect, useState } from 'react';
import { ActivityIndicator, SectionList, StyleSheet, Text, View } from 'react-native';
import { Ride } from '../api/rides';
import { Poi } from '../api/poi';
import { useAuthStore } from '../store/authStore';
import { useRidesStore } from '../store/ridesStore';
import SwipeableRideRow from './SwipeableRideRow';

interface Props {
  rides: Ride[];
  pois: Poi[];
  loading: boolean;
  error: string | null;
}

// Server returns naive local datetime "2024-06-01T08:00:00" — parse as local time.
function parseDeparture(s: string): Date {
  return new Date(s.replace('T', ' '));
}

// Returns a stable YYYY-MM-DD key for grouping (in local time).
function dateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function sectionTitle(key: string): string {
  const now = new Date();
  if (key === dateKey(now)) return 'Today';
  // Parse the key back as local noon to avoid DST edge cases.
  const d = new Date(`${key}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

const PAST_HIDE_MINUTES = 5;

interface TimeLabel {
  text: string;
  isPast: boolean;
}

function formatTime(departure: Date): TimeLabel {
  const minutes = (departure.getTime() - Date.now()) / 60_000; // negative when past
  if (minutes < 0) {
    const ago = Math.round(-minutes);
    return { text: `${ago} min ago`, isPast: true };
  }
  if (minutes <= 60) {
    return { text: `In ${Math.round(minutes)} min`, isPast: false };
  }
  return {
    text: departure.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    isPast: false,
  };
}

interface Section {
  title: string;
  data: Ride[];
}

function groupByDate(rides: Ride[]): Section[] {
  const map = new Map<string, Ride[]>();
  for (const ride of rides) {
    const dep = parseDeparture(ride.departure);
    const minutesPast = (Date.now() - dep.getTime()) / 60_000;
    if (minutesPast > PAST_HIDE_MINUTES) continue;   // silently drop from view
    const key = dateKey(dep);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ride);
  }
  return Array.from(map.entries()).map(([key, data]) => ({
    title: sectionTitle(key),
    data,
  }));
}

export default function RidesScreen({ rides, pois, loading, error }: Props) {
  const poiMap = new Map(pois.map((p) => [p.id, p.name]));
  const currentUserId = useAuthStore((s) => s.userId);
  const deleteRide = useRidesStore((s) => s.deleteRide);

  // Re-render every 30 s so departure labels and the >5-min filter stay live.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>;
  }

  if (error) {
    return <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>;
  }

  if (rides.length === 0) {
    return <View style={styles.center}><Text style={styles.emptyText}>No upcoming rides.</Text></View>;
  }

  const sections = groupByDate(rides);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(r) => String(r.id)}
      contentContainerStyle={styles.list}
      stickySectionHeadersEnabled
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => {
        const { text, isPast } = formatTime(parseDeparture(item.departure));
        return (
          <SwipeableRideRow
            ride={item}
            isOwner={item.userId === currentUserId}
            fromName={poiMap.get(item.departsFrom) ?? `POI ${item.departsFrom}`}
            toName={poiMap.get(item.leadsTo) ?? `POI ${item.leadsTo}`}
            timeLabel={text}
            isPast={isPast}
            onDelete={deleteRide}
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 14, color: '#EF4444', textAlign: 'center', paddingHorizontal: 24 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },

  list: { paddingBottom: 16 },

  sectionHeader: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },

  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB', marginHorizontal: 16 },
});
