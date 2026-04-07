import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  interestStatus?: number;  // resolved display value: 0=pending, 1=accepted, 2=declined, 3=cancelled by driver, 4=cancelled by user; undefined = no interest
  interestCounts?: InterestCounts;
  isHidden?: boolean;
  onDelete: (id: number) => void;
  onIgnore: (id: number) => void;
  onUnhide?: (id: number) => void;
  onExpressInterest: (id: number) => void;
  onCancelInterest?: () => void;
  onClaimAsk?: (id: number) => void;
  onPress?: () => void;
}

export default function SwipeableRideRow({
  ride, isOwner, fromName, toName, timeLabel, isPast, interestStatus, interestCounts, isHidden, onDelete, onIgnore, onUnhide, onExpressInterest, onCancelInterest, onClaimAsk, onPress,
}: Props) {
  const { t } = useTranslation();
  const swipeRef = useRef<Swipeable>(null);
  const driverName = useUserCacheStore((s) => ride.userId != null ? s.cache.get(ride.userId)?.name : undefined);

  const INTEREST_ICONS: Record<number, { name: React.ComponentProps<typeof MaterialCommunityIcons>['name']; color: string; label: string }> = {
    0: { name: 'clock-outline',  color: '#9CA3AF', label: t('interest.status_pending')  },
    1: { name: 'check-circle',   color: '#22C55E', label: t('interest.status_accepted') },
    2: { name: 'close-circle',   color: '#EF4444', label: t('interest.status_declined') },
    4: { name: 'cancel',         color: '#9CA3AF', label: t('interest.status_cancelled') },
  };

  function renderDeleteAction(progress: Animated.AnimatedInterpolation<number>) {
    const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    return (
      <Animated.View style={[styles.actionPanel, { opacity }]}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            swipeRef.current?.close();
            Alert.alert(
              t('ride.cancel_title'),
              t('ride.cancel_message'),
              [
                { text: t('common.keep'), style: 'cancel', onPress: () => swipeRef.current?.close() },
                { text: t('ride.cancel_confirm'), style: 'destructive', onPress: () => onDelete(ride.id) },
              ],
            );
          }}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  function renderInterestAction() {
    return (
      <View style={styles.interestAction}>
        <TouchableOpacity style={styles.actionButton} onPress={() => {
          swipeRef.current?.close();
          onExpressInterest(ride.id);
        }}>
          <MaterialCommunityIcons name="arrow-right-bold" size={32} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  function renderCancelInterestAction(progress: Animated.AnimatedInterpolation<number>) {
    const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    return (
      <Animated.View style={[styles.actionPanel, { opacity }]}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            swipeRef.current?.close();
            Alert.alert(
              t('interest.cancel_title'),
              t('interest.cancel_message'),
              [
                { text: t('common.keep'), style: 'cancel', onPress: () => swipeRef.current?.close() },
                { text: t('interest.cancel_confirm'), style: 'destructive', onPress: () => onCancelInterest?.() },
              ],
            );
          }}
        >
          <MaterialCommunityIcons name="minus-thick" size={28} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  function renderClaimAction(progress: Animated.AnimatedInterpolation<number>) {
    const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    return (
      <Animated.View style={[styles.actionPanel, styles.claimPanel, { opacity }]}>
        <TouchableOpacity style={styles.actionButton} onPress={() => { swipeRef.current?.close(); onClaimAsk?.(ride.id); }}>
          <View style={styles.claimIcons}>
            <MaterialCommunityIcons name="auto-fix" size={22} color="#fff" />
            <MaterialCommunityIcons name="car-side" size={22} color="#fff" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  function renderIgnoreAction(progress: Animated.AnimatedInterpolation<number>) {
    const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    return (
      <Animated.View style={[styles.actionPanel, styles.ignorePanel, { opacity }]}>
        <TouchableOpacity style={styles.actionButton} onPress={() => { swipeRef.current?.close(); onIgnore(ride.id); }}>
          <MaterialCommunityIcons name="eye-off-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  function renderUnhideAction(progress: Animated.AnimatedInterpolation<number>) {
    const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    return (
      <Animated.View style={[styles.actionPanel, styles.unhidePanel, { opacity }]}>
        <TouchableOpacity style={styles.actionButton} onPress={() => { swipeRef.current?.close(); onUnhide?.(ride.id); }}>
          <MaterialCommunityIcons name="eye-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  const rowContent = (
    <Pressable style={[styles.row, isHidden && styles.rowHidden]} onPress={onPress}>
      {isOwner ? (
        <View style={styles.vehicleIcon}>
          <MaterialCommunityIcons name="car-side" size={24} color="#fff" />
        </View>
      ) : (
        <View style={styles.avatarWrapper}>
          {ride.userId != null
            ? <UserAvatar userId={ride.userId} size={40} />
            : <View style={styles.noDriverIcon}><MaterialCommunityIcons name="help-circle-outline" size={32} color="#9CA3AF" /></View>}
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
        {!isOwner && !interestCounts && interestStatus !== undefined && (() => {
          const icon = INTEREST_ICONS[interestStatus];
          return icon ? (
            <View style={styles.statusRow}>
              <MaterialCommunityIcons name={icon.name} size={18} color={icon.color} />
              <Text style={[styles.statusLabel, { color: icon.color }]}>{icon.label}</Text>
            </View>
          ) : null;
        })()}
        {interestCounts && (interestCounts.pending + interestCounts.accepted + interestCounts.declined) > 0 && (
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
      renderLeftActions={!isOwner
        ? interestStatus === 1
          ? renderCancelInterestAction
          : interestStatus === undefined
            ? renderInterestAction
            : undefined
        : undefined}
      renderRightActions={onClaimAsk ? renderClaimAction : isOwner ? renderDeleteAction : isHidden ? renderUnhideAction : renderIgnoreAction}
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
  noDriverIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
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
  ignorePanel: {
    backgroundColor: '#9CA3AF',
  },
  claimPanel: {
    backgroundColor: '#7C3AED',
  },
  claimIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unhidePanel: {
    backgroundColor: '#22C55E',
  },
  rowHidden: {
    opacity: 0.4,
  },
  actionButton: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
