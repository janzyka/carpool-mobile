import React, { useRef, useState } from 'react';
import {
  NativeSyntheticEvent,
  StyleSheet,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';

const DIGIT_COUNT = 6;

interface Props {
  onComplete: (code: string) => void;
  disabled?: boolean;
}

export default function OtpInput({ onComplete, disabled = false }: Props) {
  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(''));
  const inputs = useRef<Array<TextInput | null>>(Array(DIGIT_COUNT).fill(null));

  const handleChange = (text: string, index: number) => {
    const char = text.replace(/[^0-9]/g, '').slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);

    if (char && index < DIGIT_COUNT - 1) {
      inputs.current[index + 1]?.focus();
    }

    if (next.every((d) => d !== '')) {
      onComplete(next.join(''));
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.row}>
      {digits.map((digit, i) => (
        <TextInput
          key={i}
          ref={(ref) => { inputs.current[i] = ref; }}
          style={[styles.box, digit ? styles.boxFilled : null]}
          value={digit}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={(e) => handleKeyPress(e, i)}
          keyboardType="number-pad"
          maxLength={1}
          textAlign="center"
          editable={!disabled}
          selectTextOnFocus
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  box: {
    width: 46,
    height: 56,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  boxFilled: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
});
