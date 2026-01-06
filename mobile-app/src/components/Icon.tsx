import React from 'react';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from 'react-native-paper';

interface IconProps extends React.ComponentProps<typeof MaterialCommunityIcon> {
  color?: string;
}

export function Icon({ color, ...props }: IconProps) {
  const theme = useTheme();
  const iconColor = color || theme.colors.onSurface;

  return <MaterialCommunityIcon color={iconColor} {...props} />;
}

export default Icon;
