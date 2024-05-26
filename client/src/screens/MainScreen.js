import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import MomentsStackNavigator from '../navigators/MomentsStackNavigator';
import SettingsStackNavigator from '../navigators/SettingsStackNavigator';
import ChatStackNavigator from '../navigators/ChatStackNavigator';
import VisionStackNavigator from '../navigators/VisionStackNavigator';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {
  faComment,
  faCameraRetro,
  faCog,
  faEye,
} from '@fortawesome/free-solid-svg-icons';

const Tab = createBottomTabNavigator();

const MainScreen = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopWidth: 0,
          marginBottom: 0,
          paddingBottom: 15,
          height: 60,
        },
        headerShown: false,
        tabBarLabel: () => null,
      }}>
      <Tab.Screen
        name="Chat"
        component={ChatStackNavigator}
        options={{
          tabBarIcon: ({color}) => (
            <FontAwesomeIcon icon={faComment} size={30} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Moments"
        component={MomentsStackNavigator}
        options={{
          tabBarIcon: ({color}) => {
            return (
              <FontAwesomeIcon icon={faCameraRetro} size={30} color={color} />
            );
          },
        }}
      />
      <Tab.Screen
        name="Vision"
        component={VisionStackNavigator}
        options={{
          tabBarIcon: ({color}) => {
            return <FontAwesomeIcon icon={faEye} size={30} color={color} />;
          },
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStackNavigator}
        options={{
          tabBarIcon: ({color}) => {
            return <FontAwesomeIcon icon={faCog} size={30} color={color} />;
          },
        }}
      />
    </Tab.Navigator>
  );
};

export default MainScreen;
