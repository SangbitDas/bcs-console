import {
  useFonts,
  NotoSansBengali_400Regular,
  NotoSansBengali_500Medium,
  NotoSansBengali_600SemiBold,
  NotoSansBengali_700Bold,
} from '@expo-google-fonts/noto-sans-bengali';

export const FONT = {
  light: 'NotoSansBengali_400Regular',
  ui: 'NotoSansBengali_400Regular',
  uiMed: 'NotoSansBengali_500Medium',
  uiSemi: 'NotoSansBengali_600SemiBold',
  uiBold: 'NotoSansBengali_700Bold',
  display: 'NotoSansBengali_700Bold',
  displayBold: 'NotoSansBengali_700Bold',
  displayBlack: 'NotoSansBengali_700Bold',
  digits: 'NotoSansBengali_600SemiBold',
  digitsBold: 'NotoSansBengali_700Bold',
  digitsReg: 'NotoSansBengali_400Regular',
};

export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    NotoSansBengali_400Regular,
    NotoSansBengali_500Medium,
    NotoSansBengali_600SemiBold,
    NotoSansBengali_700Bold,
  });
  return !!loaded;
}
