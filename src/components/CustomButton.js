import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

/**
 * CustomButton
 * Props:
 *   title        string
 *   onPress      function
 *   variant      'primary' | 'secondary' | 'danger' | 'outline'
 *   loading      boolean
 *   disabled     boolean
 *   style        ViewStyle (extra overrides)
 *   fullWidth    boolean
 */
const CustomButton = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style = undefined,
  fullWidth = false,
}) => {
  const isDisabled = disabled || loading;
  const spinnerColor = variant === 'outline' ? '#00E5FF' : variant === 'auth' ? '#041318' : '#fff';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} size="small" />
      ) : (
        <Text style={[
          styles.text, 
          variant === 'outline' && styles.outlineText,
          variant === 'auth' && styles.authText
        ]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primary: {
    backgroundColor: '#00E5FF',
    elevation: 6,
  },
  secondary: {
    backgroundColor: '#00FF88',
    elevation: 6,
  },
  danger: {
    backgroundColor: '#FF4444',
    elevation: 6,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#00E5FF',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    color: '#0D0D0D',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.4,
  },
  outlineText: {
    color: '#00E5FF',
  },
  auth: {
    backgroundColor: '#00E5FF',
    borderWidth: 0,
    elevation: 2,
  },
  authText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});

export default CustomButton;
