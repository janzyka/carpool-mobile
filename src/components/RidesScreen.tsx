import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { Ride, createRideInterest, respondToRideInterest } from '../api/rides';
import { Poi } from '../api/poi';
import { useIgnoredRidesStore } from '../store/ignoredRidesStore';
import { useMyInterestsStore } from '../store/myInterestsStore';
import { useRequestsStore } from '../store/requestsStore';
import { useRidesStore } from '../store/ridesStore';
import { useAuthStore } from '../store/authStore';
import SwipeableRideRow from './SwipeableRideRow';
import SwipeableRequestRow from './SwipeableRequestRow';
import { useTranslation } from 'react-i18next';
import { parseDeparture, formatTime, groupByDate, resolveInterestDisplayStatus } from '../utils/rideUtils';

interface Props {
  rides: Ride[];
  pois: Poi[];
  loading: boolean;
  error: string | null;
  currentUserId: number | null;
  onRefresh: () => void;
}



export default function RidesScreen({ rides, pois, loading, error, currentUserId, onRefresh }: Props) {
  const { t } = useTranslation();
  const poiMap = new Map(pois.map((p) => [p.id, p.name]));
  const deleteRide = useRidesStore((s) => s.deleteRide);
  const { ignoredIds, ignoreRide } = useIgnoredRidesStore();
  const interestsByRideId = useMyInterestsStore((s) => s.byRideId);
  const fetchMyInterests = useMyInterestsStore((s) => s.fetchMyInterests);
  const { interests, fetchRequests } = useRequestsStore();
  const authUserId = useAuthStore((s) => s.userId);

  const [expandedRideId, setExpandedRideId] = useState<number | null>(null);
  const [loadingInterestIds, setLoadingInterestIds] = useState<Set<number>>(new Set());

  function toggleExpand(rideId: number) {
    setExpandedRideId((prev) => (prev === rideId ? null : rideId));
  }

  async function handleRespond(interestId: number, accepted: boolean) {
    setLoadingInterestIds((prev) => new Set([...prev, interestId]));
    try {
      await respondToRideInterest(interestId, accepted);
      if (authUserId) fetchRequests(authUserId);
    } catch {
      Alert.alert('Error', 'Could not update the request. Please try again.');
    } finally {
      setLoadingInterestIds((prev) => { const next = new Set(prev); next.delete(interestId); return next; });
    }
  }

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

  // Re-render every 30 s so departure labels and the >5-min filter stay live.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (loading && rides.length === 0) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>;
  }

  if (error) {
    return <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>;
  }

  if (rides.length === 0) {
    return <View style={styles.center}><Text style={styles.emptyText}>{t('ride.no_upcoming')}</Text></View>;
  }

  const filteredRides = rides
    .filter((r) => !ignoredIds.has(r.id))
    .filter((r) => r.userId === currentUserId);

  const sections = groupByDate(filteredRides);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(r) => String(r.id)}
      style={{ backgroundColor: 'transparent' }}
      contentContainerStyle={styles.list}
      stickySectionHeadersEnabled
      refreshControl={<RefreshControl refreshing={loading && rides.length > 0} onRefresh={onRefresh} tintColor="#3D3530" />}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => {
        const { text, isPast } = formatTime(parseDeparture(item.departure));
        const isExpanded = expandedRideId === item.id;
        const fromName = poiMap.get(item.departsFrom) ?? `POI ${item.departsFrom}`;
        const toName   = poiMap.get(item.leadsTo)    ?? `POI ${item.leadsTo}`;
        const rideInterests = interests.filter((i) => i.rideId === item.id);
        const interestCounts = {
          pending:  rideInterests.filter((i) => i.driverResponse === 0).length,
          accepted: rideInterests.filter((i) => i.driverResponse === 1).length,
          declined: rideInterests.filter((i) => i.driverResponse === 2).length,
        };
        return (
          <View>
            <SwipeableRideRow
              ride={item}
              isOwner={item.userId === currentUserId}
              fromName={fromName}
              toName={toName}
              timeLabel={text}
              isPast={isPast}
              interestStatus={resolveInterestDisplayStatus(interestsByRideId.get(item.id))}
              interestCounts={interestCounts}
              onDelete={deleteRide}
              onIgnore={ignoreRide}
              onExpressInterest={handleExpressInterest}
              onPress={() => toggleExpand(item.id)}
            />
            {isExpanded && (
              <View style={styles.detailPanel}>
                {rideInterests.length === 0 ? (
                  <View style={styles.noInterests}>
                    <Text style={styles.noInterestsText}>{t('ride.no_interests')}</Text>
                  </View>
                ) : (
                  rideInterests.map((interest, idx) => (
                    <View key={interest.id}>
                      {idx > 0 && <View style={styles.interestSeparator} />}
                      <SwipeableRequestRow
                        interest={interest}
                        compact
                        isLoading={loadingInterestIds.has(interest.id)}
                        onAccept={(id) => handleRespond(id, true)}
                        onDecline={(id) => handleRespond(id, false)}
                      />
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
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

  detailPanel: {
    backgroundColor: '#E9EAEC',
    borderLeftWidth: 4,
    borderLeftColor: '#68D391',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D1D5DB',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D1D5DB',
  },
  noInterests: { paddingVertical: 14, alignItems: 'center' },
  noInterestsText: { fontSize: 14, color: '#9CA3AF' },
  interestSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: '#D1D5DB', marginHorizontal: 16 },
});
