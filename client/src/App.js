import 'react-native-get-random-values';
import 'react-native-polyfill-globals/auto';
import React, {useContext, useEffect, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AuthContext, AuthProvider} from './contexts/AuthContext';
import {MomentsProvider} from './contexts/MomentsContext';
import {ChatProvider} from './contexts/ChatContext';
import {BluetoothProvider} from './contexts/BluetoothContext';
import {WebSocketProvider} from './contexts/WebSocketContext';
import {SnackbarProvider} from './contexts/SnackbarContext';
import AuthScreen from './screens/AuthScreen';
import MainScreen from './screens/MainScreen';
import MySnackBar from './components/SnackBar';

const Stack = createNativeStackNavigator();

const AuthenticatedRoutes = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Main"
        component={MainScreen}
        options={{headerShown: false}}
      />
    </Stack.Navigator>
  );
};

const UnauthenticatedRoutes = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Auth"
        component={AuthScreen}
        options={{headerShown: false}}
      />
    </Stack.Navigator>
  );
};

const App = () => {
  const {isAuthorized} = useContext(AuthContext);

  return (
    <NavigationContainer>
      {isAuthorized ? <AuthenticatedRoutes /> : <UnauthenticatedRoutes />}
    </NavigationContainer>
  );
};

export default () => (
  <SnackbarProvider>
    <AuthProvider>
      <WebSocketProvider>
        <BluetoothProvider>
          <MomentsProvider>
            <ChatProvider>
              <App />
            </ChatProvider>
          </MomentsProvider>
        </BluetoothProvider>
        <MySnackBar />
      </WebSocketProvider>
    </AuthProvider>
  </SnackbarProvider>
);
