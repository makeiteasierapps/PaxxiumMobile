import React, {useState} from 'react';
import {View, Text, Button, StyleSheet, Alert} from 'react-native';
import {
  useCameraPermission,
  useCameraDevice,
  Camera,
} from 'react-native-vision-camera';

const VisionTab = () => {
  const [isActive, setIsActive] = useState(false);
  const device = useCameraDevice('back');
  const {hasPermission, requestPermission} = useCameraPermission();

  const handleActivateCamera = async () => {
    console.log(device);
    try {
      if (!hasPermission) {
        const status = await requestPermission();
        console.log('Camera permission status:', status);
        if (status !== 'granted') {
          Alert.alert('Camera permission is required');
          return;
        }
      }
      setIsActive(true);
    } catch (error) {
      console.error('Failed to request camera permission', error);
    }
  };

  return (
    <View style={styles.container}>
      {isActive && device ? (
        <Camera style={styles.camera} device={device} isActive={isActive} />
      ) : (
        <View style={styles.placeholder}>
          <Text>Camera is not active</Text>
          <Button title="Activate Camera" onPress={handleActivateCamera} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    width: '100%',
    height: '50%',
  },
  placeholder: {
    width: '100%',
    height: '50%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ccc',
  },
});

export default VisionTab;
