import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRef } from 'react';
import UserAvatar from './UserAvatar';
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ride } from '../api/rides';

interface Props {
  ride: Ride;
  isOwner: boolean;
  fromName: string;
  toName: string;
  timeLabel: string;
  isPast: boolean;
  interestStatus?: number;  // 0=pending, 1=accepted, 2=declined; undefined = no interest
  onDelete: (id: number) => void;
  onIgnore: (id: number) => void;
  onExpressInterest: (id: number) => void;
}

const INTEREST_ICONS: Record<number, { name: React.ComponentProps<typeof MaterialCommunityIcons>['name']; color: string }> = {
  0: { name: 'clock-outline',  color: '#9CA3AF' },
  1: { name: 'check-circle',   color: '#22C55E' },
  2: { name: 'close-circle',   color: '#EF4444' },
};

export default function SwipeableRideRow({
  ride, isOwner, fromName, toName, timeLabel, isPast, interestStatus, onDelete, onIgnore, onExpressInterest,
}: Props) {
  const swipeRef = useRef<Swipeable>(null);

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
    <View style={styles.row}>
      <View style={styles.avatarWrapper}>
        <UserAvatar userId={ride.userId} size={40} />
        {isOwner && (
          <MaterialCommunityIcons name="heart" size={12} color="#EF4444" style={styles.badge} />
        )}
        {!isOwner && interestStatus !== undefined && (() => {
          const icon = INTEREST_ICONS[interestStatus];
          return icon
            ? <MaterialCommunityIcons name={icon.name} size={14} color={icon.color} style={styles.badge} />
            : null;
        })()}
      </View>
      <View style={styles.route}>
        <Text style={styles.poi} numberOfLines={1}>{fromName}</Text>
        <Text style={styles.arrow}>→</Text>
        <Text style={styles.poi} numberOfLines={1}>{toName}</Text>
      </View>
      <Text style={[styles.time, isPast && styles.timePast]}>{timeLabel}</Text>
    </View>
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
    backgroundColor: '#fff',
  },
  avatarWrapper: {
    position: 'relative',
    width: 40,
    height: 40,
    marginRight: 12,
  },
  route: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6, marginRight: 12 },
  poi: { fontSize: 15, color: '#111827', fontWeight: '500', flexShrink: 1 },
  arrow: { fontSize: 14, color: '#9CA3AF' },
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
  badge: {
    position: 'absolute',
    top: -1,
    right: -3,
  },
  noEntryBar: {
    width: 36,
    height: 7,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
});
