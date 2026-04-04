import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import {
  ActivityIndicator, Alert, Image, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { patchUser } from '../api/users';
import { VehicleDto } from '../api/vehicles';
import { useUserCacheStore } from '../store/userCacheStore';
import { useVehiclesStore } from '../store/vehiclesStore';
import AddVehicleModal from './AddVehicleModal';

interface Props {
  currentUserId: number | null;
}

export default function ProfileScreen({ currentUserId }: Props) {
  const { getUser, ensureUser, refreshUser } = useUserCacheStore();
  const { vehicles, loading: vehiclesLoading, removeVehicle } = useVehiclesStore();
  const user = currentUserId ? getUser(currentUserId) : undefined;

  const [localName, setLocalName] = useState('');
  const [localIcon, setLocalIcon] = useState<string | null>(null); // base64 of new pick, null = unchanged
  const [saving, setSaving] = useState(false);
  const initialised = useRef(false);

  const [showAddVehicle, setShowAddVehicle] = useState(false);

  async function handleDeleteVehicle(vehicle: VehicleDto) {
    Alert.alert('Delete vehicle', `Remove "${vehicle.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => removeVehicle(vehicle.id),
      },
    ]);
  }

  function renderDeleteAction(progress: Animated.AnimatedInterpolation<number>, vehicle: VehicleDto) {
    const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    return (
      <Animated.View style={[styles.deleteAction, { opacity }]}>
        <Pressable style={styles.deleteButton} onPress={() => handleDeleteVehicle(vehicle)}>
          <MaterialCommunityIcons name="trash-can-outline" size={24} color="#fff" />
        </Pressable>
      </Animated.View>
    );
  }

  useEffect(() => {
    if (currentUserId) ensureUser(currentUserId);
  }, [currentUserId]);

  // Initialise editable fields once user loads (only once).
  useEffect(() => {
    if (user && !initialised.current) {
      initialised.current = true;
      setLocalName(user.name);
    }
  }, [user]);

  const isDirty =
    (localName.trim() !== '' && localName.trim() !== user?.name) ||
    localIcon !== null;

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow access to your photo library to change your avatar.');
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
      if (compressed.base64) setLocalIcon(compressed.base64);
    }
  }

  async function handleSave() {
    if (!currentUserId || !isDirty) return;
    setSaving(true);
    try {
      const payload: { name?: string; icon?: string } = {};
      if (localName.trim() !== user?.name) payload.name = localName.trim();
      if (localIcon !== null) payload.icon = localIcon;
      await patchUser(currentUserId, payload);
      await refreshUser(currentUserId);
      setLocalIcon(null); // mark icon change as committed
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch {
      Alert.alert('Error', 'Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3D3530" />
      </View>
    );
  }

  // Avatar source: prefer newly picked image, then saved icon, then initials fallback.
  const avatarUri = localIcon
    ? `data:image/jpeg;base64,${localIcon}`
    : user.icon
    ? `data:image/jpeg;base64,${user.icon}`
    : null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Avatar */}
      <Pressable onPress={pickImage} style={styles.avatarWrapper}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{user.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.cameraOverlay}>
          <MaterialCommunityIcons name="camera" size={18} color="#fff" />
        </View>
      </Pressable>

      {/* Name */}
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={localName}
        onChangeText={setLocalName}
        placeholder="Your name"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="words"
        returnKeyType="done"
      />

      {/* Phone — read-only */}
      <Text style={styles.label}>Phone</Text>
      <View style={styles.readOnly}>
        <Text style={styles.readOnlyText}>{user.phoneNumber ?? '—'}</Text>
      </View>

      {/* Save button — only visible when there are pending changes */}
      {isDirty && (
        <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.saveLabel}>Save</Text>}
        </Pressable>
      )}

      {/* ── Vehicles section ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Vehicles</Text>
        <Pressable onPress={() => setShowAddVehicle(true)} style={styles.addButton} hitSlop={10}>
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      {vehiclesLoading && vehicles.length === 0 ? (
        <ActivityIndicator size="small" color="#3D3530" style={{ marginTop: 12 }} />
      ) : vehicles.length === 0 ? (
        <Text style={styles.emptyVehicles}>No vehicles yet. Tap + to add one.</Text>
      ) : (
        vehicles.map((v) => {
          const iconUri = v.icon ? `data:image/jpeg;base64,${v.icon}` : null;
          const meta = [v.plateNumber, v.seats != null ? `${v.seats} seats` : null].filter(Boolean).join(' · ');
          return (
            <Swipeable
              key={v.id}
              renderRightActions={(progress) => renderDeleteAction(progress, v)}
              overshootRight={false}
              containerStyle={styles.swipeableContainer}
            >
              <View style={styles.vehicleRow}>
                {iconUri ? (
                  <Image source={{ uri: iconUri }} style={styles.vehicleAvatar} />
                ) : (
                  <View style={styles.vehicleAvatarFallback}>
                    <MaterialCommunityIcons name="car-side" size={22} color="#fff" />
                  </View>
                )}
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleName}>{v.name}</Text>
                  {!!meta && <Text style={styles.vehicleMeta}>{meta}</Text>}
                </View>
              </View>
            </Swipeable>
          );
        })
      )}

      <AddVehicleModal
        visible={showAddVehicle}
        userId={currentUserId!}
        onClose={() => setShowAddVehicle(false)}
        onCreated={() => setShowAddVehicle(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  container: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24, paddingBottom: 48 },
  // Vehicles
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 32, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#3D3530' },
  addButton: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#3D3530', justifyContent: 'center', alignItems: 'center' },
  emptyVehicles: { fontSize: 14, color: '#9CA3AF', alignSelf: 'flex-start', marginTop: 4 },
  swipeableContainer: { alignSelf: 'stretch' },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12, padding: 12, marginBottom: 8, gap: 12 },
  deleteAction: { width: 72, marginBottom: 8, borderRadius: 12, overflow: 'hidden' },
  deleteButton: { flex: 1, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  vehicleAvatar: { width: 44, height: 44, borderRadius: 22 },
  vehicleAvatarFallback: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#68D391', justifyContent: 'center', alignItems: 'center' },
  vehicleInfo: { flex: 1 },
  vehicleName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  vehicleMeta: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  avatarWrapper: { marginBottom: 32, position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarFallback: { backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 40, fontWeight: '700', color: '#fff' },
  cameraOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#3D3530',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#E8E2DC',
  },
  label: { alignSelf: 'flex-start', fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 6, marginTop: 16 },
  input: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: '#111827',
  },
  readOnly: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  readOnlyText: { fontSize: 16, color: '#6B7280' },
  saveButton: {
    marginTop: 32, width: '100%', backgroundColor: '#3D3530',
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  saveLabel: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
