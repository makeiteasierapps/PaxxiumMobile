import {useContext} from 'react';
import {Button} from 'react-native-elements';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import VisionTab from '../screens/VisionTab';

const Stack = createNativeStackNavigator();

const VisionStackNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="VisionMain"
      screenOptions={{headerStyle: {backgroundColor: '#000'}}}>
      <Stack.Screen name="VisionMain" component={VisionTab} options={{title: ''}} />
    </Stack.Navigator>
  );
};

export default VisionStackNavigator;
