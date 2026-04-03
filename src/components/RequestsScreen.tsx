import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { respondToRideInterest } from '../api/rides';
import { Poi } from '../api/poi';
import { Ride } from '../api/rides';
import { IncomingInterest, useRequestsStore } from '../store/requestsStore';
import { useAuthStore } from '../store/authStore';
import SwipeableRequestRow from './SwipeableRequestRow';

interface Props {
  interests: IncomingInterest[];
  rides: Ride[];
  pois: Poi[];
  loading: boolean;
  error: string | null;
}


export default function RequestsScreen({ interests, rides, pois, loading, error }: Props) {
  const rideMap  = new Map(rides.map((r) => [r.id, r]));
  const poiMap   = new Map(pois.map((p) => [p.id, p.name]));
  const currentUserId = useAuthStore((s) => s.userId);
  const fetchRequests = useRequestsStore((s) => s.fetchRequests);

  async function respond(id: number, accepted: boolean) {
    try {
      await respondToRideInterest(id, accepted);
      if (currentUserId) fetchRequests(currentUserId);
    } catch {
      Alert.alert('Error', 'Could not update the request. Please try again.');
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>;
  }

  if (error) {
    return <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>;
  }

  if (interests.length === 0) {
    return <View style={styles.center}><Text style={styles.emptyText}>No requests yet.</Text></View>;
  }

  return (
    <FlatList
      data={interests}
      keyExtractor={(item) => `${item.rideId}-${item.userId}`}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => {
        const ride = rideMap.get(item.rideId);
        const fromName = ride ? (poiMap.get(ride.departsFrom) ?? `POI ${ride.departsFrom}`) : `Ride ${item.rideId}`;
        const toName   = ride ? (poiMap.get(ride.leadsTo)    ?? `POI ${ride.leadsTo}`)    : '—';
        return (
          <SwipeableRequestRow
            interest={item}
            fromName={fromName}
            toName={toName}
            onAccept={(id) => respond(id, true)}
            onDecline={(id) => respond(id, false)}
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

  list: { paddingVertical: 8 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB', marginHorizontal: 16 },


});
