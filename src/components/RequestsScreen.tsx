import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SectionList, StyleSheet, Text, View } from 'react-native';
import { Ride, createRideInterest } from '../api/rides';
import { Poi } from '../api/poi';
import { useIgnoredRidesStore } from '../store/ignoredRidesStore';
import { useMyInterestsStore } from '../store/myInterestsStore';
import { useRidesStore } from '../store/ridesStore';
import SwipeableRideRow from './SwipeableRideRow';
import { parseDeparture, formatTime, groupByDate } from '../utils/rideUtils';

interface Props {
  rides: Ride[];
  pois: Poi[];
  loading: boolean;
  error: string | null;
  currentUserId: number | null;
}

export default function RequestsScreen({ rides, pois, loading, error, currentUserId }: Props) {
  const poiMap = new Map(pois.map((p) => [p.id, p.name]));
  const { ignoredIds, ignoreRide } = useIgnoredRidesStore();
  const interestsByRideId = useMyInterestsStore((s) => s.byRideId);
  const fetchMyInterests = useMyInterestsStore((s) => s.fetchMyInterests);
  const deleteRide = useRidesStore((s) => s.deleteRide);

  // Re-render every 30 s so time labels and the >5-min filter stay live.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  async function handleExpressInterest(rideId: number) {
    try {
      await createRideInterest(rideId);
      if (currentUserId) fetchMyInterests(currentUserId);
      Alert.alert('Requested', 'Your interest has been sent to the driver.');
    } catch (error: any) {
      if (error?.response?.status === 409) {
        Alert.alert('Already requested', 'You have already expressed interest in this ride.');
      } else {
        Alert.alert('Error', 'Could not send your request. Please try again.');
      }
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>;
  }

  if (error) {
    return <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>;
  }

  const othersRides = rides
    .filter((r) => !ignoredIds.has(r.id))
    .filter((r) => r.userId !== currentUserId);

  const sections = groupByDate(othersRides);

  if (othersRides.length === 0) {
    return <View style={styles.center}><Text style={styles.emptyText}>No rides available.</Text></View>;
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(r) => String(r.id)}
      style={{ backgroundColor: 'transparent' }}
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
            isOwner={false}
            fromName={poiMap.get(item.departsFrom) ?? `POI ${item.departsFrom}`}
            toName={poiMap.get(item.leadsTo) ?? `POI ${item.leadsTo}`}
            timeLabel={text}
            isPast={isPast}
            interestStatus={interestsByRideId.get(item.id)?.status}
            onDelete={deleteRide}
            onIgnore={ignoreRide}
            onExpressInterest={handleExpressInterest}
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
    backgroundColor: 'rgba(243,244,246,0.88)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB', marginHorizontal: 16 },
});
