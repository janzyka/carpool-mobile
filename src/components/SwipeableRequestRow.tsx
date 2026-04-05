import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import UserAvatar from './UserAvatar';
import { Alert, Animated, Linking, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { IncomingInterest } from '../store/requestsStore';
import { useUserCacheStore } from '../store/userCacheStore';

interface Props {
  interest: IncomingInterest;
  fromName?: string;
  toName?: string;
  compact?: boolean;
  isLoading?: boolean;
  onAccept: (id: number) => void;
  onDecline: (id: number) => void;
}

function JumpingDots({ color }: { color: string }) {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 120),
          Animated.timing(dot, { toValue: -5, duration: 200, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0,  duration: 200, useNativeDriver: true }),
          Animated.delay((dots.length - i) * 120),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={dotStyles.row}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={[dotStyles.dot, { backgroundColor: color, transform: [{ translateY: dot }] }]} />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

const STATUS_LABEL: Record<number, { label: string; color: string }> = {
  0: { label: 'Pending',  color: '#9CA3AF' },
  1: { label: 'Accepted', color: '#22C55E' },
  2: { label: 'Declined', color: '#EF4444' },
};

export default function SwipeableRequestRow({ interest, fromName, toName, compact, isLoading, onAccept, onDecline }: Props) {
  const swipeRef = useRef<Swipeable>(null);
  const cachedUser = useUserCacheStore((s) => s.cache.get(interest.userId));

  function close() { swipeRef.current?.close(); }

  function renderLeftAction(progress: Animated.AnimatedInterpolation<number>) {
    const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    return (
      <Animated.View style={[styles.acceptAction, { opacity }]}>
        <TouchableOpacity style={styles.actionButton} onPress={() => { close(); onAccept(interest.id); }}>
          <MaterialCommunityIcons name="arrow-right-bold" size={32} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  function renderRightAction(progress: Animated.AnimatedInterpolation<number>) {
    const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    return (
      <Animated.View style={[styles.declineAction, { opacity }]}>
        <TouchableOpacity style={styles.actionButton} onPress={() => { close(); onDecline(interest.id); }}>
          <View style={styles.noEntryBar} />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  const status = STATUS_LABEL[interest.status] ?? { label: 'Unknown', color: '#9CA3AF' };

  return (
    <Swipeable
      ref={swipeRef}
      renderLeftActions={renderLeftAction}
      renderRightActions={renderRightAction}
      leftThreshold={60}
      rightThreshold={60}
      overshootLeft={false}
      overshootRight={false}
    >
      <View style={[styles.row, compact && styles.rowCompact]}>
        <UserAvatar userId={interest.userId} size={compact ? 34 : 40} />
        {compact ? (
          <>
            <View style={styles.nameBlock}>
              <View style={styles.nameRow}>
                <Text style={styles.userName} numberOfLines={1}>{cachedUser?.name ?? '…'}</Text>
                {isLoading
                  ? <JumpingDots color={status.color} />
                  : <Text style={[styles.statusBadge, { color: status.color }]}>{status.label}</Text>}
              </View>
              <View style={styles.contactRow}>
                <Pressable
                  style={styles.contactBtn}
                  onPress={() => {
                    const phone = cachedUser?.phoneNumber;
                    if (phone) Linking.openURL(`tel:${phone}`);
                    else Alert.alert('No phone number', 'This user has not provided a phone number.');
                  }}
                >
                  <MaterialCommunityIcons name="phone" size={16} color="#2563EB" />
                  <Text style={styles.contactLabel}>Call</Text>
                </Pressable>
                <Pressable
                  style={styles.contactBtn}
                  onPress={() => {
                    const phone = cachedUser?.phoneNumber?.replace(/\D/g, '');
                    if (phone) Linking.openURL(`https://wa.me/${phone}`);
                    else Alert.alert('No phone number', 'This user has not provided a phone number.');
                  }}
                >
                  <MaterialCommunityIcons name="whatsapp" size={16} color="#25D366" />
                  <Text style={styles.contactLabel}>WhatsApp</Text>
                </Pressable>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.info}>
            <View style={styles.route}>
              <Text style={styles.poi} numberOfLines={1}>{fromName}</Text>
              <Text style={styles.arrow}>→</Text>
              <Text style={styles.poi} numberOfLines={1}>{toName}</Text>
            </View>
            {isLoading
              ? <JumpingDots color={status.color} />
              : <Text style={[styles.status, { color: status.color }]}>{status.label}</Text>}
          </View>
        )}
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  acceptAction: {
    width: 80,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineAction: {
    width: 80,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noEntryBar: {
    width: 36,
    height: 7,
    borderRadius: 3,
    backgroundColor: '#fff',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  rowCompact: {
    paddingLeft: 28,
    paddingVertical: 9,
    backgroundColor: 'transparent',
  },
  info: { flex: 1, marginLeft: 12 },
  route: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  poi:   { fontSize: 15, color: '#111827', fontWeight: '500', flexShrink: 1 },
  arrow: { fontSize: 14, color: '#9CA3AF' },
  status: { fontSize: 12, fontWeight: '600', marginTop: 3 },
  nameBlock: { flex: 1, marginLeft: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  userName: { fontSize: 14, color: '#111827', fontWeight: '500', flexShrink: 1 },
  contactRow: { flexDirection: 'row', gap: 8, marginTop: 5 },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  contactLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
  statusBadge: { fontSize: 14, fontWeight: '700' },
});
