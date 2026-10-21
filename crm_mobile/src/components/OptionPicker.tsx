import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChipRow } from './ChipRow';
import { FormInput } from './FormInput';
import { colors } from '../theme';

interface Props {
  label: string;
  // The choices already stored in the database (e.g. every brand in use).
  options: string[];
  value: string;
  onChange: (v: string) => void;
}

const NEW = '__new__';

// Pick from values that already exist, or type a new one. The list is built
// from the database by the caller, so nothing here is hardcoded.
export const OptionPicker: React.FC<Props> = ({ label, options, value, onChange }) => {
  const known = useMemo(() => options.filter(Boolean), [options]);
  const isCustom = value !== '' && !known.includes(value);
  const [adding, setAdding] = useState(false);
  const showInput = adding || isCustom || known.length === 0;

  const items = [
    ...known.map(o => ({ key: o, label: o })),
    { key: NEW, label: '+ New' },
  ];

  return (
    <View>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <ChipRow
        variant="form"
        items={items}
        selected={showInput ? NEW : value}
        onSelect={(k) => {
          if (k === NEW) { setAdding(true); onChange(''); }
          else { setAdding(false); onChange(k); }
        }}
      />
      {showInput && (
        <FormInput
          value={value}
          onChangeText={onChange}
          placeholder={`Type a new ${label.toLowerCase()}`}
          autoCapitalize="words"
          accessibilityLabel={`New ${label}`}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '700', color: colors.label, letterSpacing: 0.6, marginBottom: 6 },
});
