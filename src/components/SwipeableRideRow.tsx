import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRef } from 'react';
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
  onDelete: (id: number) => void;
}

export default function SwipeableRideRow({ ride, isOwner, fromName, toName, timeLabel, isPast, onDelete }: Props) {
  const swipeRef = useRef<Swipeable>(null);

  function renderRightActions(progress: Animated.AnimatedInterpolation<number>) {
    const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    return (
      <Animated.View style={[styles.deleteAction, { opacity }]}>
        <TouchableOpacity
          style={styles.deleteButton}
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

  const rowContent = (
    <View style={styles.row}>
      <MaterialCommunityIcons name="account-circle" size={40} color="#D1D5DB" style={styles.avatar} />
      <View style={styles.route}>
        <Text style={styles.poi} numberOfLines={1}>{fromName}</Text>
        <Text style={styles.arrow}>→</Text>
        <Text style={styles.poi} numberOfLines={1}>{toName}</Text>
      </View>
      <Text style={[styles.time, isPast && styles.timePast]}>{timeLabel}</Text>
    </View>
  );

  if (!isOwner) {
    // No swipe for rides owned by others — action TBD.
    return rowContent;
  }

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      rightThreshold={60}
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
  avatar: { marginRight: 12 },
  route: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6, marginRight: 12 },
  poi: { fontSize: 15, color: '#111827', fontWeight: '500', flexShrink: 1 },
  arrow: { fontSize: 14, color: '#9CA3AF' },
  time:     { fontSize: 14, color: '#2563EB', fontWeight: '600', flexShrink: 0 },
  timePast: { color: '#EF4444' },

  deleteAction: {
    width: 80,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
