import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  TextInputProps, StyleProp, ViewStyle, TouchableOpacity,
} from 'react-native';
import { useFormScroll } from './FormModal';
import { Icon } from './Icon';
import { colors, spacing } from '../theme';

export interface FormInputProps extends TextInputProps {
  label?: string;
  containerStyle?: StyleProp<ViewStyle>;
  isPassword?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  helperText?: string;
}

export const FormInput = forwardRef<any, FormInputProps>(({
  label,
  containerStyle,
  style,
  isPassword = false,
  leftIcon,
  rightIcon,
  error,
  helperText,
  secureTextEntry,
  onFocus,
  onBlur,
  ...rest
}, ref) => {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<any>(null);
  const wrapperRef = useRef<any>(null);
  const formScroll = useFormScroll();

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
    isFocused: () => inputRef.current?.isFocused() ?? false,
    clear: () => inputRef.current?.clear(),
  }));

  const isSecure = isPassword ? !showPassword : (secureTextEntry ?? false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label.toUpperCase()}</Text>
        </View>
      ) : null}

      <View
        ref={wrapperRef}
        collapsable={false}
        style={[
          styles.inputWrapper,
          focused && styles.inputWrapperFocused,
          error ? styles.inputWrapperError : null,
        ]}
      >
        {leftIcon ? (
          <View style={styles.leftIconContainer} pointerEvents="none">
            {leftIcon}
          </View>
        ) : null}

        <TextInput
          ref={inputRef}
          style={[styles.input, rest.multiline && styles.inputMultiline, style]}
          placeholderTextColor={colors.text3}
          secureTextEntry={isSecure}
          accessibilityLabel={label}
          onFocus={(e) => {
            setFocused(true);
            formScroll?.reveal(wrapperRef.current);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />

        {isPassword ? (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword((prev) => !prev)}
            activeOpacity={0.7}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
          >
            <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.text2} />
          </TouchableOpacity>
        ) : rightIcon ? (
          <View style={styles.rightIconContainer}>{rightIcon}</View>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: 11, fontWeight: '700', color: colors.label, letterSpacing: 0.6 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard2,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  inputWrapperFocused: { borderColor: colors.navy, backgroundColor: colors.white },
  inputWrapperError: { borderColor: colors.red },
  leftIconContainer: { marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  rightIconContainer: { marginLeft: 8, justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, fontSize: 15, color: colors.text1, paddingVertical: 12, paddingHorizontal: 0, minHeight: 48 },
  inputMultiline: { minHeight: 84, textAlignVertical: 'top' },
  eyeButton: { marginLeft: 4, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 12, color: colors.redDark, marginTop: 4, fontWeight: '600' },
  helperText: { fontSize: 12, color: colors.text3, marginTop: 4 },
});
