import { useColorScheme } from 'react-native';

const light = {
  bg: '#F6F7FB',
  surface: '#FFFFFF',
  text: '#121826',
  muted: '#6B7280',
  border: '#E5E7EB',
  primary: '#1E5EFF',
  onPrimary: '#FFFFFF',
  bubbleOther: '#FFFFFF',
  danger: '#D92D20',
};

const dark: typeof light = {
  bg: '#0E1116',
  surface: '#171B22',
  text: '#F3F4F6',
  muted: '#9CA3AF',
  border: '#272C35',
  primary: '#5B8CFF',
  onPrimary: '#FFFFFF',
  bubbleOther: '#232833',
  danger: '#F97066',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}
