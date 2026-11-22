import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { UserDetailContext } from './../context/UserDetailContext';
import { ThemeProvider, useTheme } from './../context/ThemeContext';
import { TutorialProvider } from './../context/TutorialContext';
import {
  MD3DarkTheme,
  MD3LightTheme,
  Provider as PaperProvider,
} from 'react-native-paper';
import { useEffect, useState } from "react";

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppShell({ userDetail, setUserDetail }: { userDetail: any; setUserDetail: (v: any) => void }) {
  const { isDark, colors } = useTheme();
  const paperTheme = isDark ? MD3DarkTheme : MD3LightTheme;

  return (
    <PaperProvider theme={paperTheme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <UserDetailContext.Provider value={{ userDetail, setUserDetail }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
      </UserDetailContext.Provider>
    </PaperProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'outfit': require('./../assets/fonts/Outfit-Regular.ttf'),
    'outfit-medium': require('./../assets/fonts/Outfit-Medium.ttf'),
    'outfit-bold': require('./../assets/fonts/Outfit-Bold.ttf'),
  });

  const [userDetail, setUserDetail] = useState<any>(null);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <TutorialProvider>
          <AppShell userDetail={userDetail} setUserDetail={setUserDetail} />
        </TutorialProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
