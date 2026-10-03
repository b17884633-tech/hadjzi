import { ActivityIndicator, I18nManager, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
} from '@expo-google-fonts/cairo';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/di/AppProvider';
import { RootNavigator } from './src/presentation/navigation/RootNavigator';
import { theme } from './src/core/ui/theme';
import { CAIRO } from './src/core/ui/theme/fonts';

// Flex RTL; AppText handles physical text alignment
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function App() {
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer
          direction="rtl"
          theme={{
            ...DefaultTheme,
            dark: false,
            fonts: {
              regular: {
                fontFamily: CAIRO.regular,
                fontWeight: '400',
              },
              medium: {
                fontFamily: CAIRO.medium,
                fontWeight: '500',
              },
              bold: {
                fontFamily: CAIRO.bold,
                fontWeight: '700',
              },
              heavy: {
                fontFamily: CAIRO.bold,
                fontWeight: '800',
              },
            },
            colors: {
              ...DefaultTheme.colors,
              primary: theme.colors.primary,
              background: theme.colors.background,
              card: theme.colors.surface,
              text: theme.colors.text,
              border: theme.colors.border,
              notification: theme.colors.accent,
            },
          }}
        >
          <RootNavigator />
          <StatusBar style="dark" />
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
});
