import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { Ride, cancelRideInterest, createRideInterest } from '../api/rides';
import { Poi } from '../api/poi';
import { useIgnoredRidesStore } from '../store/ignoredRidesStore';
import { useMyInterestsStore } from '../store/myInterestsStore';
import { useRidesStore } from '../store/ridesStore';
import { useUserCacheStore } from '../store/userCacheStore';
import { useVehiclesStore } from '../store/vehiclesStore';
import SwipeableRideRow from './SwipeableRideRow';
import { useTranslation } from 'react-i18next';
import { parseDeparture, formatTime, groupByDate, resolveInterestDisplayStatus } from '../utils/rideUtils';

interface Props {
  rides: Ride[];
  pois: Poi[];
  loading: boolean;
  error: string | null;
  currentUserId: number | null;
  showAll?: boolean;
  onRefresh: () => void;
}

export default function RequestsScreen({ rides, pois, loading, error, currentUserId, showAll, onRefresh }: Props) {
  const poiMap   = new Map(pois.map((p) => [p.id, p.name]));
  const poiById  = new Map(pois.map((p) => [p.id, p]));
  const { t } = useTranslation();
  const { ignoredIds, ignoreRide, unignoreRide } = useIgnoredRidesStore();
  const interestsByRideId = useMyInterestsStore((s) => s.byRideId);
  const fetchMyInterests = useMyInterestsStore((s) => s.fetchMyInterests);
  const deleteRide = useRidesStore((s) => s.deleteRide);
  const { ensureUser, cache: userCache } = useUserCacheStore();
  const { vehicleCache, ensureVehicle } = useVehiclesStore();

  const [expandedRideId, setExpandedRideId] = useState<number | null>(null);

  function toggleExpand(ride: Ride) {
    const interest = interestsByRideId.get(ride.id);
    if (interest?.driverResponse !== 1) return; // only accepted requests are expandable
    setExpandedRideId((prev) => (prev === ride.id ? null : ride.id));
    // Pre-fetch ride owner and vehicle when first expanding.
    ensureUser(ride.userId);
    if (ride.vehicleId) ensureVehicle(ride.vehicleId);
  }

  // Re-render every 30 s so time labels and the >5-min filter stay live.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  async function handleCancelInterest(rideId: number) {
    const interest = interestsByRideId.get(rideId);
    if (!interest) return;
    try {
      await cancelRideInterest(interest.id);
      setExpandedRideId(null);
      if (currentUserId) fetchMyInterests(currentUserId);
    } catch (error: any) {
      Alert.alert(t('common.error'), t('interest.cancel_error'));
    }
  }

  async function handleExpressInterest(rideId: number) {
    try {
      await createRideInterest(rideId);
      if (ignoredIds.has(rideId)) unignoreRide(rideId);
      if (currentUserId) fetchMyInterests(currentUserId);
      Alert.alert(t('interest.requested_title'), t('interest.requested_message'));
    } catch (error: any) {
      if (error?.response?.status === 409) {
        Alert.alert(t('interest.already_title'), t('interest.already_message'));
      } else {
        Alert.alert(t('common.error'), t('interest.send_error'));
      }
    }
  }

  if (loading && rides.length === 0) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>;
  }

  if (error) {
    return <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>;
  }

  const othersRides = rides
    .filter((r) => showAll || !ignoredIds.has(r.id))
    .filter((r) => r.userId !== currentUserId);

  const sections = groupByDate(othersRides);

  if (othersRides.length === 0) {
    return <View style={styles.center}><Text style={styles.emptyText}>{t('ride.no_available')}</Text></View>;
  }

  return (
    <SectionList
      sections={sections}
      extraData={interestsByRideId}
      keyExtractor={(r) => String(r.id)}
      style={{ backgroundColor: 'transparent' }}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={loading && rides.length > 0} onRefresh={onRefresh} tintColor="#3D3530" />}
      stickySectionHeadersEnabled
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => {
        const { text, isPast } = formatTime(parseDeparture(item.departure));
        const interest = interestsByRideId.get(item.id);
        const isAccepted = interest?.driverResponse === 1;
        const isExpanded = expandedRideId === item.id;
        const owner = userCache.get(item.userId);
        const vehicle = item.vehicleId ? vehicleCache.get(item.vehicleId) : undefined;
        const departurePoi = poiById.get(item.departsFrom);
        return (
          <View>
            <SwipeableRideRow
              ride={item}
              isOwner={false}
              fromName={poiMap.get(item.departsFrom) ?? `POI ${item.departsFrom}`}
              toName={poiMap.get(item.leadsTo) ?? `POI ${item.leadsTo}`}
              timeLabel={text}
              isPast={isPast}
              interestStatus={resolveInterestDisplayStatus(interest)}
              isHidden={ignoredIds.has(item.id)}
              onDelete={deleteRide}
              onIgnore={ignoreRide}
              onUnhide={unignoreRide}
              onExpressInterest={handleExpressInterest}
              onCancelInterest={() => handleCancelInterest(item.id)}
              onPress={isAccepted ? () => toggleExpand(item) : undefined}
            />
            {isAccepted && isExpanded && (
              <View style={styles.detailPanel}>
                {/* Vehicle row */}
                {item.vehicleId ? (
                  <View style={styles.detailRow}>
                    {vehicle?.icon ? (
                      <Image source={{ uri: `data:image/jpeg;base64,${vehicle.icon}` }} style={styles.vehicleIcon} />
                    ) : (
                      <View style={[styles.vehicleIcon, styles.vehicleIconFallback]}>
                        <MaterialCommunityIcons name="car-side" size={18} color="#fff" />
                      </View>
                    )}
                    <View style={styles.vehicleInfo}>
                      <Text style={styles.vehicleName}>{vehicle?.name ?? '…'}</Text>
                      {vehicle?.plateNumber ? <Text style={styles.vehicleSub}>{vehicle.plateNumber}</Text> : null}
                      {vehicle?.seats ? <Text style={styles.vehicleSub}>{t('ride.seats', { count: vehicle.seats })}</Text> : null}
                    </View>
                  </View>
                ) : (
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="car-off" size={20} color="#9CA3AF" />
                    <Text style={styles.noVehicleText}>{t('ride.no_vehicle')}</Text>
                  </View>
                )}
                <View style={styles.detailSeparator} />
                {/* Contact buttons */}
                <View style={styles.contactRow}>
                  <Pressable
                    style={styles.contactBtn}
                    onPress={() => {
                      const phone = owner?.phoneNumber;
                      if (phone) Linking.openURL(`tel:${phone}`);
                      else Alert.alert('No phone number', 'The driver has not provided a phone number.');
                    }}
                  >
                    <MaterialCommunityIcons name="phone" size={22} color="#2563EB" />
                    <Text style={styles.contactLabel}>{t('common.call')}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.contactBtn}
                    onPress={() => {
                      const phone = owner?.phoneNumber?.replace(/\D/g, '');
                      if (phone) Linking.openURL(`https://wa.me/${phone}`);
                      else Alert.alert('No phone number', 'The driver has not provided a phone number.');
                    }}
                  >
                    <MaterialCommunityIcons name="whatsapp" size={22} color="#25D366" />
                    <Text style={styles.contactLabel}>{t('common.whatsapp')}</Text>
                  </Pressable>
                  {departurePoi?.latitude != null && departurePoi?.longitude != null && (
                    <Pressable
                      style={styles.contactBtn}
                      onPress={() => Linking.openURL(
                        `https://maps.google.com/?q=${departurePoi.latitude},${departurePoi.longitude}&label=${encodeURIComponent(departurePoi.name)}`
                      )}
                    >
                      <MaterialCommunityIcons name="map-marker" size={22} color="#EF4444" />
                      <Text style={styles.contactLabel}>{t('common.maps')}</Text>
                    </Pressable>
                  )}
                </View>
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
    borderLeftColor: '#22C55E',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D1D5DB',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D1D5DB',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  vehicleIcon: { width: 36, height: 36, borderRadius: 18 },
  vehicleIconFallback: { backgroundColor: '#68D391', justifyContent: 'center', alignItems: 'center' },
  vehicleInfo: { flex: 1 },
  vehicleName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  vehicleSub: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  noVehicleText: { fontSize: 13, color: '#9CA3AF', marginLeft: 6 },
  detailSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: '#D1D5DB', marginVertical: 10 },
  contactRow: { flexDirection: 'row', gap: 12 },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 12, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  contactLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
});
