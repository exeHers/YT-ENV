import React from 'react';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import YTEnvApp from '../rn-app/App';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <YTEnvApp />
    </SafeAreaProvider>
  );
}
