import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#DAB44A', // Sayina gold/amber color
    secondary: '#333333',
    tertiary: '#4CAF50',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    error: '#B00020',
    // Additional colors used in the app
    success: '#4CAF50',
    warning: '#FF9800',
    info: '#2196F3',
    lightGray: '#E0E0E0',
    darkGray: '#757575',
    black: '#000000',
    white: '#FFFFFF',
  },
  roundness: 8,
};

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
};

export const spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
};
