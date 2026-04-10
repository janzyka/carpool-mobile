import { useEffect, useRef, useState, Fragment } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Ride, createRideInterest } from '../api/rides';
import { Poi } from '../api/poi';
import { useIgnoredRidesStore } from '../store/ignoredRidesStore';
import { useMyInterestsStore } from '../store/myInterestsStore';
import { parseDeparture, formatTime } from '../utils/rideUtils';

interface Props {
  rides: Ride[];
  pois: Poi[];
  currentUserId: number | null;
  showAll?: boolean;
}

const INITIAL_REGION = { latitude: 50.0755, longitude: 14.4378, latitudeDelta: 2, longitudeDelta: 2 };

function bezierPoints(
  from: { latitude: number; longitude: number },
  to:   { latitude: number; longitude: number },
  steps = 24,
): { latitude: number; longitude: number }[] {
  // Midpoint offset perpendicular to the line — creates a smooth arc.
  const midLat = (from.latitude  + to.latitude)  / 2;
  const midLng = (from.longitude + to.longitude) / 2;
  const dLat   = to.latitude  - from.latitude;
  const dLng   = to.longitude - from.longitude;
  // Perpendicular direction, scaled to ~20% of the line length.
  const scale  = 0.2;
  const ctrlLat = midLat - dLng * scale;
  const ctrlLng = midLng + dLat * scale;

  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const u = 1 - t;
    return {
      latitude:  u * u * from.latitude  + 2 * u * t * ctrlLat + t * t * to.latitude,
      longitude: u * u * from.longitude + 2 * u * t * ctrlLng + t * t * to.longitude,
    };
  });
}

function departureColor(departure: string): string {
  const hours = (parseDeparture(departure).getTime() - Date.now()) / 3_600_000;
  if (hours < 1)  return '#EF4444';
  if (hours < 3)  return '#F97316';
  if (hours < 12) return '#EAB308';
  if (hours < 48) return '#22C55E';
  return '#3B82F6';
}

const LEGEND = [
  { color: '#EF4444', label: '< 1h' },
  { color: '#F97316', label: '1–3h' },
  { color: '#EAB308', label: '3–12h' },
  { color: '#22C55E', label: '< 2d' },
  { color: '#3B82F6', label: 'later' },
];

export default function RidesMapView({ rides, pois, currentUserId, showAll }: Props) {
  const mapRef = useRef<MapView>(null);
  const [selected, setSelected] = useState<Ride | null>(null);
  const { ignoredIds } = useIgnoredRidesStore();
  const fetchMyInterests = useMyInterestsStore((s) => s.fetchMyInterests);
  const poiById = new Map(pois.map((p) => [p.id, p]));

  const now = Date.now();
  const mappable = rides
    .filter((r) => showAll || !ignoredIds.has(r.id))
    .filter((r) => r.userId !== currentUserId)
    .filter((r) => parseDeparture(r.departure).getTime() > now)
    .filter((r) => {
      const f = poiById.get(r.departsFrom), t = poiById.get(r.leadsTo);
      return f?.latitude != null && f?.longitude != null && t?.latitude != null && t?.longitude != null;
    });

  useEffect(() => {
    if (mappable.length === 0) return;
    const coords = mappable.flatMap((r) => {
      const f = poiById.get(r.departsFrom)!, t = poiById.get(r.leadsTo)!;
      return [{ latitude: f.latitude, longitude: f.longitude }, { latitude: t.latitude, longitude: t.longitude }];
    });
    setTimeout(() => mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 80, right: 40, bottom: 200, left: 40 }, animated: true,
    }), 400);
  }, [mappable.length]);

  async function handleExpressInterest(ride: Ride) {
    try {
      await createRideInterest(ride.id);
      if (currentUserId) fetchMyInterests(currentUserId);
      setSelected(null);
      Alert.alert('Requested', 'Your interest has been sent to the driver.');
    } catch (e: any) {
      Alert.alert(e?.response?.status === 409 ? 'Already requested' : 'Error',
        e?.response?.status === 409 ? 'You have already expressed interest in this ride.' : 'Could not send your request.');
    }
  }

  const selFrom = selected ? poiById.get(selected.departsFrom) : null;
  const selTo   = selected ? poiById.get(selected.leadsTo)    : null;

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={styles.map} initialRegion={INITIAL_REGION}>
        {mappable.map((ride) => {
          const f = poiById.get(ride.departsFrom)!;
          const t = poiById.get(ride.leadsTo)!;
          const color = departureColor(ride.departure);
          const curve = bezierPoints(f, t);
          const mid   = curve[Math.floor(curve.length / 2)];
          return (
            <Fragment key={ride.id}>
              <Polyline
                coordinates={curve}
                strokeColor={color} strokeWidth={3} />
              <Marker coordinate={{ latitude: f.latitude, longitude: f.longitude }}
                pinColor="green" onPress={() => setSelected(ride)} />
              <Marker coordinate={{ latitude: t.latitude, longitude: t.longitude }}
                pinColor="red" onPress={() => setSelected(ride)} />
              <Marker coordinate={mid} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false} onPress={() => setSelected(ride)}>
                <View pointerEvents="none" style={[styles.midDot, { backgroundColor: color }]} />
              </Marker>
            </Fragment>
          );
        })}
      </MapView>

      <View style={styles.legend}>
        {LEGEND.map(({ color, label }) => (
          <View key={label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {selected && selFrom && selTo && (
        <View style={styles.panel}>
          <Pressable style={styles.panelClose} onPress={() => setSelected(null)} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={20} color="#6B7280" />
          </Pressable>
          <View style={styles.panelRoute}>
            <Text style={styles.panelPoi} numberOfLines={1}>{selFrom.name}</Text>
            <MaterialCommunityIcons name="arrow-right" size={16} color="#6B7280" />
            <Text style={styles.panelPoi} numberOfLines={1}>{selTo.name}</Text>
          </View>
          <Text style={styles.panelTime}>{formatTime(parseDeparture(selected.departure)).text}</Text>
          <Pressable style={styles.interestBtn} onPress={() => handleExpressInterest(selected)}>
            <MaterialCommunityIcons name="thumb-up" size={18} color="#fff" />
            <MaterialCommunityIcons name="check-bold" size={14} color="#fff" />
            <Text style={styles.interestBtnText}>Express Interest</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  midDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
  legend: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 10,
    padding: 8, gap: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 11, color: '#374151', fontWeight: '600' },
  panelClose: { position: 'absolute', top: 12, right: 16 },
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', padding: 20, paddingTop: 28, paddingBottom: 36,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 8,
  },
  panelRoute: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  panelPoi: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827' },
  panelTime: { fontSize: 14, color: '#2563EB', fontWeight: '600', marginBottom: 14 },
  interestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 14,
  },
  interestBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
