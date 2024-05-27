import {createNativeStackNavigator} from '@react-navigation/native-stack';
import SamTab from '../screens/SamTab';

const Stack = createNativeStackNavigator();

const SamStackNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="VisionMain"
      screenOptions={{headerStyle: {backgroundColor: '#000'}}}>
      <Stack.Screen name="SamMain" component={SamTab} options={{title: ''}} />
    </Stack.Navigator>
  );
};

export default SamStackNavigator;
