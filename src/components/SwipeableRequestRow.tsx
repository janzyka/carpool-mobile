import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRef } from 'react';
import UserAvatar from './UserAvatar';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { IncomingInterest } from '../store/requestsStore';

interface Props {
  interest: IncomingInterest;
  fromName: string;
  toName: string;
  onAccept: (id: number) => void;
  onDecline: (id: number) => void;
}

const STATUS_LABEL: Record<number, { label: string; color: string }> = {
  0: { label: 'Pending',  color: '#9CA3AF' },
  1: { label: 'Accepted', color: '#22C55E' },
  2: { label: 'Declined', color: '#EF4444' },
};

export default function SwipeableRequestRow({ interest, fromName, toName, onAccept, onDecline }: Props) {
  const swipeRef = useRef<Swipeable>(null);

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
      <View style={styles.row}>
        <UserAvatar userId={interest.userId} size={40} />
        <View style={styles.info}>
          <View style={styles.route}>
            <Text style={styles.poi} numberOfLines={1}>{fromName}</Text>
            <Text style={styles.arrow}>→</Text>
            <Text style={styles.poi} numberOfLines={1}>{toName}</Text>
          </View>
          <Text style={[styles.status, { color: status.color }]}>{status.label}</Text>
        </View>
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
  info: { flex: 1, marginLeft: 12 },
  route: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  poi:   { fontSize: 15, color: '#111827', fontWeight: '500', flexShrink: 1 },
  arrow: { fontSize: 14, color: '#9CA3AF' },
  status: { fontSize: 12, fontWeight: '600', marginTop: 3 },
});
