import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { UserDetailContext } from './../context/UserDetailContext';
import { Provider as PaperProvider } from 'react-native-paper';
import { useState } from "react";
export default function RootLayout() {

  useFonts({
    'outfit': require('./../assets/fonts/Outfit-Regular.ttf'),
    'outfit-bold': require('./../assets/fonts/Outfit-Bold.ttf')
  })

  const [userDetail, setUserDetail]=useState();

  return (
    <PaperProvider>
    <UserDetailContext.Provider value={{ userDetail, setUserDetail }}>
    <Stack screenOptions={{
      headerShown: false
    }}>
    </Stack>
    </UserDetailContext.Provider>
    </PaperProvider>
  )
}
