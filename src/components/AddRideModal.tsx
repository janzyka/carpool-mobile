import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, Pressable,
  StyleSheet, Text, TouchableWithoutFeedback, View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { submitRide } from '../api/rides';
import { Poi } from '../api/poi';
import { useVehiclesStore } from '../store/vehiclesStore';
import MapPoiPicker from './MapPoiPicker';

interface Props {
  visible: boolean;
  pois: Poi[];
  onClose: () => void;
  onCreated: () => void;
}

function defaultDeparture() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 15, 0, 0);
  return d;
}

type PickerTarget = 'from' | 'to' | null;

export default function AddRideModal({ visible, pois, onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const [from, setFrom] = useState<Poi | null>(null);
  const [to, setTo]     = useState<Poi | null>(null);
  const [departure, setDeparture] = useState<Date>(defaultDeparture);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [mapTarget, setMapTarget] = useState<PickerTarget>(null);
  const [dateMode, setDateMode] = useState<'date' | 'time'>('date');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const vehicles = useVehiclesStore((s) => s.vehicles);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleDto | null>(null);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);

  function reset() {
    setFrom(null);
    setTo(null);
    setDeparture(defaultDeparture());
    setPickerTarget(null);
    setMapTarget(null);
    setShowDatePicker(false);
    setSubmitting(false);
    setSelectedVehicle(null);
  }

  function handleClose() { reset(); onClose(); }

  async function handleSubmit() {
    if (!from) { Alert.alert(t('add_ride.missing_field_title'), t('add_ride.missing_from')); return; }
    if (!to)   { Alert.alert(t('add_ride.missing_field_title'), t('add_ride.missing_to')); return; }
    if (from.id === to.id) { Alert.alert(t('add_ride.invalid_title'), t('add_ride.same_location')); return; }
    if (departure <= new Date()) { Alert.alert(t('add_ride.invalid_time_title'), t('add_ride.past_departure')); return; }
    setSubmitting(true);
    try {
      await submitRide(from.id, to.id, departure, selectedVehicle?.id);
      reset();
      onCreated();
    } catch {
      Alert.alert(t('common.error'), t('add_ride.create_error'));
      setSubmitting(false);
    }
  }

  function openDatePicker() { setDateMode('date'); setShowDatePicker(true); }
  function openTimePicker() { setDateMode('time'); setShowDatePicker(true); }

  const formatDate = (d: Date) =>
    d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const formatTime = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={styles.sheet}>
        {/* Header */}
        <View style={styles.sheetHeader}>
          <Pressable onPress={handleClose}><Text style={styles.cancel}>{t('common.cancel')}</Text></Pressable>
          <Text style={styles.sheetTitle}>{t('add_ride.title')}</Text>
          <Pressable onPress={handleSubmit} disabled={submitting}>
            {submitting
              ? <ActivityIndicator size="small" color="#2563EB" />
              : <Text style={styles.done}>{t('common.create')}</Text>}
          </Pressable>
        </View>

        {/* From */}
        <Text style={styles.label}>{t('add_ride.from_label')}</Text>
        <View style={styles.selectorRow}>
          <Pressable style={[styles.selector, styles.selectorFlex]} onPress={() => setPickerTarget('from')}>
            <Text style={from ? styles.selectorValue : styles.selectorPlaceholder}>
              {from?.name ?? t('add_ride.from_placeholder')}
            </Text>
          </Pressable>
          <Pressable style={styles.mapIconBtn} onPress={() => setMapTarget('from')}>
            <MaterialCommunityIcons name="map-marker-outline" size={24} color="#2563EB" />
          </Pressable>
        </View>

        {/* To */}
        <Text style={styles.label}>{t('add_ride.to_label')}</Text>
        <View style={styles.selectorRow}>
          <Pressable style={[styles.selector, styles.selectorFlex]} onPress={() => setPickerTarget('to')}>
            <Text style={to ? styles.selectorValue : styles.selectorPlaceholder}>
              {to?.name ?? t('add_ride.to_placeholder')}
            </Text>
          </Pressable>
          <Pressable style={styles.mapIconBtn} onPress={() => setMapTarget('to')}>
            <MaterialCommunityIcons name="map-marker-outline" size={24} color="#2563EB" />
          </Pressable>
        </View>

        {/* Departure */}
        <Text style={styles.label}>{t('add_ride.departure_label')}</Text>
        <View style={styles.dateRow}>
          <Pressable style={[styles.selector, styles.dateCell]} onPress={openDatePicker}>
            <Text style={styles.selectorValue}>{formatDate(departure)}</Text>
          </Pressable>
          <Pressable style={[styles.selector, styles.timeCell]} onPress={openTimePicker}>
            <Text style={styles.selectorValue}>{formatTime(departure)}</Text>
          </Pressable>
        </View>

        {/* Vehicle — only shown when user has at least one */}
        {vehicles.length > 0 && (
          <>
            <Text style={styles.label}>{t('add_ride.vehicle_label')}</Text>
            <Pressable style={styles.selector} onPress={() => setShowVehiclePicker(true)}>
              <Text style={selectedVehicle ? styles.selectorValue : styles.selectorPlaceholder}>
                {selectedVehicle ? selectedVehicle.name : t('add_ride.vehicle_placeholder')}
              </Text>
            </Pressable>
          </>
        )}

        {showDatePicker && (
          <DateTimePicker
            value={departure}
            mode={dateMode}
            display="spinner"
            minimumDate={new Date()}
            onChange={(_, date) => {
              setShowDatePicker(false);
              if (!date) return;
              const now = new Date();
              setDeparture(date <= now ? new Date(now.getTime() + 15 * 60 * 1000) : date);
            }}
          />
        )}
      </View>

      {/* Vehicle picker sheet */}
      {showVehiclePicker && (
        <Modal visible animationType="slide" transparent onRequestClose={() => setShowVehiclePicker(false)}>
          <TouchableWithoutFeedback onPress={() => setShowVehiclePicker(false)}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>
          <View style={styles.poiSheet}>
            <Text style={styles.poiSheetTitle}>{t('add_ride.select_vehicle')}</Text>
            <FlatList
              data={[{ id: -1, name: t('add_ride.vehicle_none') } as any, ...vehicles]}
              keyExtractor={(v) => String(v.id)}
              renderItem={({ item }) => (
                <Pressable style={styles.poiRow} onPress={() => {
                  setSelectedVehicle(item.id === -1 ? null : item);
                  setShowVehiclePicker(false);
                }}>
                  <Text style={styles.poiName}>{item.name}</Text>
                </Pressable>
              )}
            />
          </View>
        </Modal>
      )}

      {/* Map POI picker */}
      <MapPoiPicker
        visible={mapTarget !== null}
        pois={pois}
        onSelect={(poi) => { mapTarget === 'from' ? setFrom(poi) : setTo(poi); setMapTarget(null); }}
        onClose={() => setMapTarget(null)}
      />

      {/* POI picker sheet */}
      {pickerTarget !== null && (
        <Modal visible animationType="slide" transparent onRequestClose={() => setPickerTarget(null)}>
          <TouchableWithoutFeedback onPress={() => setPickerTarget(null)}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>
          <View style={styles.poiSheet}>
            <Text style={styles.poiSheetTitle}>
              {pickerTarget === 'from' ? t('add_ride.select_departure') : t('add_ride.select_destination')}
            </Text>
            <FlatList
              data={pois}
              keyExtractor={(p) => String(p.id)}
              renderItem={({ item }) => (
                <Pressable style={styles.poiRow} onPress={() => {
                  pickerTarget === 'from' ? setFrom(item) : setTo(item);
                  setPickerTarget(null);
                }}>
                  <Text style={styles.poiName}>{item.name}</Text>
                </Pressable>
              )}
            />
          </View>
        </Modal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },

  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 20, paddingBottom: 36,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  cancel: { fontSize: 16, color: '#6B7280' },
  done:   { fontSize: 16, color: '#2563EB', fontWeight: '700' },

  label: { fontSize: 13, color: '#6B7280', fontWeight: '600', marginBottom: 6, marginTop: 16 },
  selector: {
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 10, padding: 14,
  },
  selectorValue:       { fontSize: 15, color: '#111827' },
  selectorPlaceholder: { fontSize: 15, color: '#9CA3AF' },

  selectorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectorFlex: { flex: 1 },
  mapIconBtn: { padding: 10, backgroundColor: '#EFF6FF', borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFE' },
  dateRow:  { flexDirection: 'row', gap: 10 },
  dateCell: { flex: 2 },
  timeCell: { flex: 1 },

  poiSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '60%', padding: 20, paddingBottom: 36,
  },
  poiSheetTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 16 },
  poiRow: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  poiName: { fontSize: 15, color: '#111827' },
});
