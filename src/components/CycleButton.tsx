import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, ViewStyle, StyleProp } from 'react-native';

export interface CycleOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: CycleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  iconColor?: string;
  textColor?: string;
}

export default function CycleButton<T extends string>({
  options,
  value,
  onChange,
  style,
  iconColor = 'rgba(61,53,48,0.6)',
  textColor = '#3D3530',
}: Props<T>) {
  const currentIndex = options.findIndex((o) => o.value === value);
  const currentLabel = options[currentIndex]?.label ?? '';

  function cycle() {
    const next = options[(currentIndex + 1) % options.length];
    onChange(next.value);
  }

  return (
    <Pressable style={[styles.button, style]} onPress={cycle} hitSlop={8}>
      <MaterialCommunityIcons name="swap-vertical" size={18} color={iconColor} />
      <Text style={[styles.label, { color: textColor }]}>{currentLabel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
