import { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useUserCacheStore } from '../store/userCacheStore';

interface Props {
  userId: number;
  size?: number;
}

// Deterministic colour from userId so the same person always gets the same colour.
const PALETTE = ['#4F46E5', '#0891B2', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777'];
function avatarColor(userId: number) {
  return PALETTE[userId % PALETTE.length];
}

export default function UserAvatar({ userId, size = 40 }: Props) {
  const { getUser, ensureUser } = useUserCacheStore();
  const user = getUser(userId);

  useEffect(() => {
    ensureUser(userId);
  }, [userId]);

  const radius = size / 2;

  if (user?.icon) {
    return (
      <Image
        source={{ uri: `data:image/jpeg;base64,${user.icon}` }}
        style={[styles.image, { width: size, height: size, borderRadius: radius }]}
      />
    );
  }

  const initial = user?.name?.charAt(0).toUpperCase() ?? '?';
  const fontSize = Math.round(size * 0.42);

  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: radius, backgroundColor: avatarColor(userId) }]}>
      <Text style={[styles.initial, { fontSize }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { resizeMode: 'cover' },
  circle: { justifyContent: 'center', alignItems: 'center' },
  initial: { color: '#fff', fontWeight: '700' },
});
