import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, Pressable,
  StyleSheet, Text, TouchableWithoutFeedback, View,
} from 'react-native';
import { submitRide } from '../api/rides';
import { Poi } from '../api/poi';
import { useVehiclesStore } from '../store/vehiclesStore';

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
  const [from, setFrom] = useState<Poi | null>(null);
  const [to, setTo]     = useState<Poi | null>(null);
  const [departure, setDeparture] = useState<Date>(defaultDeparture);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
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
    setShowDatePicker(false);
    setSubmitting(false);
    setSelectedVehicle(null);
  }

  function handleClose() { reset(); onClose(); }

  async function handleSubmit() {
    if (!from) { Alert.alert('Missing field', 'Please select a departure location.'); return; }
    if (!to)   { Alert.alert('Missing field', 'Please select a destination.'); return; }
    if (from.id === to.id) { Alert.alert('Invalid', 'Departure and destination must differ.'); return; }
    if (departure <= new Date()) { Alert.alert('Invalid time', 'Departure must be in the future.'); return; }
    setSubmitting(true);
    try {
      await submitRide(from.id, to.id, departure, selectedVehicle?.id);
      reset();
      onCreated();
    } catch {
      Alert.alert('Error', 'Could not create the ride. Please try again.');
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
          <Pressable onPress={handleClose}><Text style={styles.cancel}>Cancel</Text></Pressable>
          <Text style={styles.sheetTitle}>New Ride</Text>
          <Pressable onPress={handleSubmit} disabled={submitting}>
            {submitting
              ? <ActivityIndicator size="small" color="#2563EB" />
              : <Text style={styles.done}>Create</Text>}
          </Pressable>
        </View>

        {/* From */}
        <Text style={styles.label}>From</Text>
        <Pressable style={styles.selector} onPress={() => setPickerTarget('from')}>
          <Text style={from ? styles.selectorValue : styles.selectorPlaceholder}>
            {from?.name ?? 'Select departure…'}
          </Text>
        </Pressable>

        {/* To */}
        <Text style={styles.label}>To</Text>
        <Pressable style={styles.selector} onPress={() => setPickerTarget('to')}>
          <Text style={to ? styles.selectorValue : styles.selectorPlaceholder}>
            {to?.name ?? 'Select destination…'}
          </Text>
        </Pressable>

        {/* Departure */}
        <Text style={styles.label}>Departure</Text>
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
            <Text style={styles.label}>Vehicle</Text>
            <Pressable style={styles.selector} onPress={() => setShowVehiclePicker(true)}>
              <Text style={selectedVehicle ? styles.selectorValue : styles.selectorPlaceholder}>
                {selectedVehicle ? selectedVehicle.name : 'Select vehicle (optional)…'}
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
            <Text style={styles.poiSheetTitle}>Select vehicle</Text>
            <FlatList
              data={[{ id: -1, name: 'None' } as any, ...vehicles]}
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

      {/* POI picker sheet */}
      {pickerTarget !== null && (
        <Modal visible animationType="slide" transparent onRequestClose={() => setPickerTarget(null)}>
          <TouchableWithoutFeedback onPress={() => setPickerTarget(null)}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>
          <View style={styles.poiSheet}>
            <Text style={styles.poiSheetTitle}>
              {pickerTarget === 'from' ? 'Select departure' : 'Select destination'}
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
