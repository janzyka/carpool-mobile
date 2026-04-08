import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ride, cancelRideInterest, claimAsk, createRideInterest } from '../api/rides';
import { Poi } from '../api/poi';
import SwipeableRideRow from './SwipeableRideRow';
import SwipeableRequestRow from './SwipeableRequestRow';
import { parseDeparture, formatTime, groupByDate, resolveInterestDisplayStatus } from '../utils/rideUtils';
import { useIgnoredRidesStore } from '../store/ignoredRidesStore';
import { useMyInterestsStore } from '../store/myInterestsStore';
import { useAuthStore } from '../store/authStore';
import { useAskInterestsStore } from '../store/askInterestsStore';

interface Props {
  asks: Ride[];
  pois: Poi[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onClaimed?: () => void;
}

export default function AsksScreen({ asks, pois, loading, error, onRefresh, onClaimed }: Props) {
  const { t } = useTranslation();
  const poiMap = new Map(pois.map((p) => [p.id, p.name]));
  const { ignoredIds, ignoreRide } = useIgnoredRidesStore();
  const interestsByRideId = useMyInterestsStore((s) => s.byRideId);
  const fetchMyInterests = useMyInterestsStore((s) => s.fetchMyInterests);
  const currentUserId = useAuthStore((s) => s.userId);
  const askInterestsByRideId = useAskInterestsStore((s) => s.byRideId);
  const askLoadingRideIds = useAskInterestsStore((s) => s.loadingRideIds);
  const fetchForAsk = useAskInterestsStore((s) => s.fetchForAsk);
  const invalidateAsk = useAskInterestsStore((s) => s.invalidateAsk);
  const [expandedRideIds, setExpandedRideIds] = useState<Set<number>>(new Set());

  // Auto-expand all asks when the list loads or refreshes.
  useEffect(() => {
    setExpandedRideIds(new Set(asks.map((a) => a.id)));
  }, [asks]);

  function toggleExpand(rideId: number) {
    setExpandedRideIds((prev) => {
      const next = new Set(prev);
      if (next.has(rideId)) {
        next.delete(rideId);
      } else {
        fetchForAsk(rideId);
        next.add(rideId);
      }
      return next;
    });
  }

  async function handleExpressInterest(rideId: number) {
    try {
      await createRideInterest(rideId);
      if (currentUserId) fetchMyInterests(currentUserId);
      invalidateAsk(rideId);
      fetchForAsk(rideId);
    } catch (error: any) {
      if (error?.response?.status === 409) {
        Alert.alert(t('interest.already_title'), t('interest.already_message'));
      } else {
        Alert.alert(t('common.error'), t('common.generic_error'));
      }
    }
  }

  async function handleClaimAsk(rideId: number) {
    try {
      await claimAsk(rideId);
      onClaimed?.();
    } catch {
      Alert.alert(t('common.error'), t('common.generic_error'));
    }
  }

  async function handleCancelInterest(interestId: number, rideId: number) {
    try {
      await cancelRideInterest(interestId);
      if (currentUserId) fetchMyInterests(currentUserId);
      invalidateAsk(rideId);
      fetchForAsk(rideId);
      onRefresh();
    } catch {
      Alert.alert(t('common.error'), t('common.generic_error'));
    }
  }

  // Pre-fetch interests for all visible asks so counts are available without expanding.
  useEffect(() => {
    asks.forEach((ask) => fetchForAsk(ask.id));
  }, [asks]);

  // Re-render every 30 s so departure labels stay live.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (loading && asks.length === 0) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>;
  }

  if (error) {
    return <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>;
  }

  const filtered = asks.filter((r) => !ignoredIds.has(r.id));

  if (filtered.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={styles.center}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#3D3530" />}
      >
        <View style={styles.emptyBadge}>
          <Text style={styles.emptyText}>{t('asks.no_upcoming')}</Text>
        </View>
      </ScrollView>
    );
  }

  const sections = groupByDate(filtered);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(r) => String(r.id)}
      style={{ backgroundColor: 'transparent' }}
      contentContainerStyle={styles.list}
      stickySectionHeadersEnabled
      refreshControl={<RefreshControl refreshing={loading && asks.length > 0} onRefresh={onRefresh} tintColor="#3D3530" />}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => {
        const { text, isPast } = formatTime(parseDeparture(item.departure));
        const fromName   = poiMap.get(item.departsFrom) ?? `POI ${item.departsFrom}`;
        const toName     = poiMap.get(item.leadsTo)    ?? `POI ${item.leadsTo}`;
        const isExpanded = expandedRideIds.has(item.id);
        // myInterestsStore used only for left-swipe control (express interest vs pending)
        const rawInterest    = interestsByRideId.get(item.id);
        const myInterest     = (rawInterest && rawInterest.status !== 1) ? rawInterest : undefined;
        const interestStatus = resolveInterestDisplayStatus(myInterest);
        // askInterestsStore: all interests from all users (loaded on expand or pre-fetch)
        const allInterests       = (askInterestsByRideId.get(item.id) ?? []).filter((i) => i.status !== 1);
        const isLoadingInterests = askLoadingRideIds.has(item.id);
        const interestCounts = askInterestsByRideId.has(item.id) ? {
          pending:  allInterests.filter((i) => i.driverResponse === 0).length,
          accepted: allInterests.filter((i) => i.driverResponse === 1).length,
          declined: allInterests.filter((i) => i.driverResponse === 2).length,
        } : undefined;
        return (
          <View>
            <SwipeableRideRow
              ride={item}
              isOwner={false}
              fromName={fromName}
              toName={toName}
              timeLabel={text}
              isPast={isPast}
              interestStatus={interestStatus}
              interestCounts={interestCounts}
              onDelete={() => {}}
              onIgnore={ignoreRide}
              onExpressInterest={handleExpressInterest}
              onClaimAsk={handleClaimAsk}
              onPress={() => toggleExpand(item.id)}
            />
            {isExpanded && (
              <View style={styles.detailPanel}>
                {isLoadingInterests ? (
                  <ActivityIndicator size="small" color="#6B7280" style={styles.panelLoader} />
                ) : allInterests.length > 0 ? (
                  allInterests.map((interest, idx) => (
                    <View key={interest.id}>
                      {idx > 0 && <View style={styles.interestSeparator} />}
                      <SwipeableRequestRow
                        interest={interest}
                        compact
                        hideContact
                        noLeftAction
                        isLoading={false}
                        onAccept={() => {}}
                        onDecline={() => {}}
                        onCancelInterest={interest.userId === currentUserId
                          ? (id) => handleCancelInterest(id, item.id)
                          : undefined}
                      />
                    </View>
                  ))
                ) : (
                  <View style={styles.noInterests}>
                    <Text style={styles.noInterestsText}>{t('ride.no_interests')}</Text>
                  </View>
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
  emptyBadge: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyText: { fontSize: 15, color: '#6B7280' },
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
  panelLoader: { marginVertical: 14 },
  interestSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: '#D1D5DB', marginHorizontal: 16 },
});
