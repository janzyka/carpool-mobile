import { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import MapView, { Marker, MapPressEvent, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Poi, createPoi } from '../api/poi';
import { usePoiStore } from '../store/poiStore';

interface Props {
  visible: boolean;
  pois: Poi[];
  onSelect: (poi: Poi) => void;
  onClose: () => void;
}

const INITIAL_REGION: Region = {
  latitude: 50.0755,
  longitude: 14.4378,
  latitudeDelta: 0.8,
  longitudeDelta: 0.8,
};

export default function MapPoiPicker({ visible, pois, onSelect, onClose }: Props) {
  const [pending, setPending] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pendingName, setPendingName] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [saving, setSaving] = useState(false);
  const mapRef = useRef<MapView>(null);
  const addPoi = usePoiStore((s) => s.addPoi);

  // Centre on current location when the modal opens.
  useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = loc.coords;
        if (!isFinite(latitude) || !isFinite(longitude)) return;
        mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 500);
      } catch {
        // Permission denied or location unavailable — stay on Prague default.
      }
    })();
  }, [visible]);

  function handleClose() {
    setPending(null);
    setPendingName('');
    onClose();
  }

  async function handleMapPress(e: MapPressEvent) {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPending({ latitude, longitude });
    setPendingName('');
    setGeocoding(true);
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      const r = results[0];
      const parts = [r?.name, r?.street, r?.city].filter(Boolean);
      setPendingName(parts.length > 0 ? parts.join(', ') : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    } catch {
      setPendingName(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    } finally {
      setGeocoding(false);
    }
  }

  async function handleCreate() {
    if (!pending || !pendingName.trim()) return;
    setSaving(true);
    try {
      const poi = await createPoi(pendingName.trim(), pending.latitude, pending.longitude);
      addPoi(poi);
      setPending(null);
      setPendingName('');
      onSelect(poi);
    } catch {
      Alert.alert('Error', 'Could not create location. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Pressable onPress={handleClose} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={24} color="#111827" />
          </Pressable>
          <Text style={styles.title}>Select Location</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={styles.hint}>Tap a pin to select an existing stop, or tap the map to create a new one.</Text>

        <MapView ref={mapRef} style={styles.map} initialRegion={INITIAL_REGION} onPress={handleMapPress}>
          {pois.filter((p) => p.latitude != null && p.longitude != null && isFinite(p.latitude) && isFinite(p.longitude)).map((poi) => (
            <Marker
              key={poi.id}
              coordinate={{ latitude: poi.latitude, longitude: poi.longitude }}
              title={poi.name}
              pinColor="#EF4444"
              onPress={() => { setPending(null); onSelect(poi); }}
            />
          ))}
          {pending && (
            <Marker coordinate={pending} pinColor="#2563EB" />
          )}
        </MapView>

        {pending && (
          <View style={styles.panel}>
            {geocoding ? (
              <ActivityIndicator color="#2563EB" style={{ marginVertical: 12 }} />
            ) : (
              <>
                <Text style={styles.panelLabel}>Name this stop</Text>
                <TextInput
                  style={styles.nameInput}
                  value={pendingName}
                  onChangeText={setPendingName}
                  placeholder="Enter location name"
                  autoFocus
                  maxLength={128}
                />
                <View style={styles.panelButtons}>
                  <Pressable style={styles.cancelBtn} onPress={() => setPending(null)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.createBtn, (!pendingName.trim() || saving) && styles.createBtnDisabled]}
                    onPress={handleCreate}
                    disabled={!pendingName.trim() || saving}
                  >
                    {saving
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.createBtnText}>Create Stop</Text>}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  hint: { fontSize: 13, color: '#6B7280', textAlign: 'center', paddingHorizontal: 20, paddingVertical: 8 },
  map: { flex: 1 },
  panel: {
    backgroundColor: '#fff', padding: 20, paddingBottom: 36,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
  },
  panelLabel: { fontSize: 13, color: '#6B7280', fontWeight: '600', marginBottom: 8 },
  nameInput: {
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 10, padding: 14, fontSize: 15, color: '#111827', marginBottom: 12,
  },
  panelButtons: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  createBtn: {
    flex: 2, backgroundColor: '#2563EB', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  createBtnDisabled: { backgroundColor: '#93C5FD' },
  createBtnText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});