import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput,
  TouchableWithoutFeedback, View,
} from 'react-native';
import { createVehicle } from '../api/vehicles';
import { useVehiclesStore } from '../store/vehiclesStore';

interface Props {
  visible: boolean;
  userId: number;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddVehicleModal({ visible, userId, onClose, onCreated }: Props) {
  const [name, setName]             = useState('');
  const [icon, setIcon]             = useState<string | null>(null); // base64
  const [plateNumber, setPlateNumber] = useState('');
  const [seats, setSeats]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const addVehicle = useVehiclesStore((s) => s.addVehicle);

  const plateRef = useRef<TextInput>(null);
  const seatsRef = useRef<TextInput>(null);

  function reset() {
    setName(''); setIcon(null); setPlateNumber(''); setSeats(''); setSubmitting(false);
  }

  function handleClose() { reset(); onClose(); }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 400, height: 400 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      if (compressed.base64) setIcon(compressed.base64);
    }
  }

  async function handleSubmit() {
    if (!name.trim()) { Alert.alert('Missing field', 'Vehicle name is required.'); return; }
    const seatsNum = seats.trim() ? parseInt(seats.trim(), 10) : undefined;
    if (seats.trim() && (isNaN(seatsNum!) || seatsNum! < 1 || seatsNum! > 99)) {
      Alert.alert('Invalid value', 'Seats must be a number between 1 and 99.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createVehicle(userId, {
        name: name.trim(),
        ...(icon ? { icon } : {}),
        ...(plateNumber.trim() ? { plateNumber: plateNumber.trim() } : {}),
        ...(seatsNum !== undefined ? { seats: seatsNum } : {}),
      });
      addVehicle(created);
      reset();
      onCreated();
    } catch {
      Alert.alert('Error', 'Could not create the vehicle. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.sheet}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.sheetHeader}>
          <Pressable onPress={handleClose}><Text style={styles.cancel}>Cancel</Text></Pressable>
          <Text style={styles.sheetTitle}>New Vehicle</Text>
          <Pressable onPress={handleSubmit} disabled={submitting}>
            {submitting
              ? <ActivityIndicator size="small" color="#2563EB" />
              : <Text style={styles.done}>Add</Text>}
          </Pressable>
        </View>

        {/* Photo picker */}
        <Pressable onPress={pickImage} style={styles.photoRow}>
          {icon ? (
            <Image source={{ uri: `data:image/jpeg;base64,${icon}` }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoFallback}>
              <MaterialCommunityIcons name="car-side" size={28} color="#fff" />
            </View>
          )}
          <Text style={styles.photoLabel}>{icon ? 'Change photo' : 'Add photo (optional)'}</Text>
        </Pressable>

        {/* Name */}
        <Text style={styles.label}>Name *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName}
          placeholder="e.g. My Skoda Octavia" placeholderTextColor="#9CA3AF"
          autoCapitalize="words" returnKeyType="next"
          onSubmitEditing={() => plateRef.current?.focus()} blurOnSubmit={false} />

        {/* Plate */}
        <Text style={styles.label}>Plate number</Text>
        <TextInput ref={plateRef} style={styles.input} value={plateNumber} onChangeText={setPlateNumber}
          placeholder="e.g. 1AB 2345" placeholderTextColor="#9CA3AF"
          autoCapitalize="characters" returnKeyType="next"
          onSubmitEditing={() => seatsRef.current?.focus()} blurOnSubmit={false} />

        {/* Seats */}
        <Text style={styles.label}>Seats (excl. driver)</Text>
        <TextInput ref={seatsRef} style={styles.input} value={seats} onChangeText={setSeats}
          placeholder="e.g. 4" placeholderTextColor="#9CA3AF"
          keyboardType="number-pad" returnKeyType="done"
          onSubmitEditing={handleSubmit} />
        </ScrollView>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 40 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  cancel: { fontSize: 16, color: '#6B7280' },
  done:   { fontSize: 16, color: '#2563EB', fontWeight: '700' },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  photoPreview: { width: 52, height: 52, borderRadius: 26 },
  photoFallback: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#68D391', justifyContent: 'center', alignItems: 'center' },
  photoLabel: { fontSize: 15, color: '#2563EB' },
  label: { fontSize: 13, color: '#6B7280', fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 14, fontSize: 15, color: '#111827' },
});
