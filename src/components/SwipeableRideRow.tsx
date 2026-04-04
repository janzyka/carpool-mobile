import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRef } from 'react';
import UserAvatar from './UserAvatar';
import { Alert, Animated, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ride } from '../api/rides';
import { useUserCacheStore } from '../store/userCacheStore';

export interface InterestCounts {
  pending: number;
  accepted: number;
  declined: number;
}

interface Props {
  ride: Ride;
  isOwner: boolean;
  fromName: string;
  toName: string;
  timeLabel: string;
  isPast: boolean;
  interestStatus?: number;  // 0=pending, 1=accepted, 2=declined; undefined = no interest
  interestCounts?: InterestCounts;
  onDelete: (id: number) => void;
  onIgnore: (id: number) => void;
  onExpressInterest: (id: number) => void;
  onPress?: () => void;
}

const INTEREST_ICONS: Record<number, { name: React.ComponentProps<typeof MaterialCommunityIcons>['name']; color: string; label: string }> = {
  0: { name: 'clock-outline', color: '#9CA3AF', label: 'Requested' },
  1: { name: 'check-circle',  color: '#22C55E', label: 'Accepted'  },
  2: { name: 'close-circle',  color: '#EF4444', label: 'Declined'  },
};

export default function SwipeableRideRow({
  ride, isOwner, fromName, toName, timeLabel, isPast, interestStatus, interestCounts, onDelete, onIgnore, onExpressInterest, onPress,
}: Props) {
  const swipeRef = useRef<Swipeable>(null);
  const driverName = useUserCacheStore((s) => s.cache.get(ride.userId)?.name);

  function renderDeleteAction(progress: Animated.AnimatedInterpolation<number>) {
    const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    return (
      <Animated.View style={[styles.actionPanel, { opacity }]}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            swipeRef.current?.close();
            Alert.alert(
              'Cancel ride',
              'This will cancel the ride for all interested passengers.',
              [
                { text: 'Keep', style: 'cancel', onPress: () => swipeRef.current?.close() },
                { text: 'Cancel ride', style: 'destructive', onPress: () => onDelete(ride.id) },
              ],
            );
          }}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  function renderInterestAction(progress: Animated.AnimatedInterpolation<number>) {
    const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    return (
      <Animated.View style={[styles.interestAction, { opacity }]}>
        <TouchableOpacity style={styles.actionButton} onPress={() => {
          swipeRef.current?.close();
          onExpressInterest(ride.id);
        }}>
          {/* One-way sign: white right-pointing arrow on blue */}
          <MaterialCommunityIcons name="arrow-right-bold" size={32} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  function renderIgnoreAction(progress: Animated.AnimatedInterpolation<number>) {
    const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    return (
      <Animated.View style={[styles.actionPanel, { opacity }]}>
        <TouchableOpacity style={styles.actionButton} onPress={() => onIgnore(ride.id)}>
          {/* No-entry sign: white horizontal bar on red background */}
          <View style={styles.noEntryBar} />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  const rowContent = (
    <Pressable style={styles.row} onPress={onPress}>
      {isOwner ? (
        <View style={styles.vehicleIcon}>
          <MaterialCommunityIcons name="car-side" size={24} color="#fff" />
        </View>
      ) : (
        <View style={styles.avatarWrapper}>
          <UserAvatar userId={ride.userId} size={40} />
        </View>
      )}
      <View style={styles.middle}>
        {!isOwner && driverName ? (
          <Text style={styles.driverName} numberOfLines={1}>{driverName}</Text>
        ) : null}
        <View style={styles.route}>
          <Text style={styles.poi} numberOfLines={1}>{fromName}</Text>
          <Text style={styles.arrow}>→</Text>
          <Text style={styles.poi} numberOfLines={1}>{toName}</Text>
        </View>
        {!isOwner && interestStatus !== undefined && (() => {
          const icon = INTEREST_ICONS[interestStatus];
          return icon ? (
            <View style={styles.statusRow}>
              <MaterialCommunityIcons name={icon.name} size={18} color={icon.color} />
              <Text style={[styles.statusLabel, { color: icon.color }]}>{icon.label}</Text>
            </View>
          ) : null;
        })()}
        {isOwner && interestCounts && (interestCounts.pending + interestCounts.accepted + interestCounts.declined) > 0 && (
          <View style={styles.countRow}>
            {interestCounts.pending  > 0 && (
              <View style={styles.countBadge}>
                <MaterialCommunityIcons name="clock-outline" size={18} color="#9CA3AF" />
                <Text style={[styles.countText, { color: '#9CA3AF' }]}>{interestCounts.pending}</Text>
              </View>
            )}
            {interestCounts.accepted > 0 && (
              <View style={styles.countBadge}>
                <MaterialCommunityIcons name="check-circle" size={18} color="#22C55E" />
                <Text style={[styles.countText, { color: '#22C55E' }]}>{interestCounts.accepted}</Text>
              </View>
            )}
            {interestCounts.declined > 0 && (
              <View style={styles.countBadge}>
                <MaterialCommunityIcons name="close-circle" size={18} color="#EF4444" />
                <Text style={[styles.countText, { color: '#EF4444' }]}>{interestCounts.declined}</Text>
              </View>
            )}
          </View>
        )}
      </View>
      <Text style={[styles.time, isPast && styles.timePast]}>{timeLabel}</Text>
    </Pressable>
  );

  return (
    <Swipeable
      ref={swipeRef}
      renderLeftActions={!isOwner ? renderInterestAction : undefined}
      renderRightActions={isOwner ? renderDeleteAction : renderIgnoreAction}
      leftThreshold={60}
      rightThreshold={60}
      overshootLeft={false}
      overshootRight={false}
    >
      {rowContent}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  avatarWrapper: {
    position: 'relative',
    width: 40,
    height: 40,
    marginRight: 12,
  },
  vehicleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#68D391',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  middle: { flex: 1, marginRight: 12 },
  driverName: { fontSize: 12, fontWeight: '400', color: '#6B7280', marginBottom: 3 },
  route: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusLabel: { fontSize: 13, fontWeight: '600' },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  countBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  countText: { fontSize: 13, fontWeight: '600' },
  poi: { fontSize: 16, color: '#111827', fontWeight: '700', flexShrink: 1 },
  arrow: { fontSize: 15, color: '#6B7280' },
  time:     { fontSize: 14, color: '#2563EB', fontWeight: '600', flexShrink: 0 },
  timePast: { color: '#EF4444' },

  interestAction: {
    width: 80,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionPanel: {
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
});
