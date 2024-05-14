import React, {useState, useRef, useEffect} from 'react';
import {View, Text, Button, StyleSheet, Alert} from 'react-native';
import {
  useCameraPermission,
  useCameraDevice,
  Camera,
  CameraRuntimeError,
  CameraCaptureError,
} from 'react-native-vision-camera';

const VisionTab = () => {
  const [isActive, setIsActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const cameraRef = useRef(null);
  const device = useCameraDevice('back');
  const {hasPermission, requestPermission} = useCameraPermission();

  useEffect(() => {
    const checkPermissions = async () => {
      if (!hasPermission) {
        const status = await requestPermission();
        if (status !== 'granted') {
          Alert.alert('Camera permission is required');
        }
      }
    };
    checkPermissions();
  }, [hasPermission, requestPermission]);

  const handleActivateCamera = () => {
    if (hasPermission) {
      setIsActive(true);
    } else {
      Alert.alert('Camera permission is required');
    }
  };

  const handleTakePhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePhoto();
        Alert.alert('Photo taken!', `Photo path: ${photo.path}`);
      } catch (error) {
        if (error instanceof CameraCaptureError) {
          Alert.alert('Capture Error', error.message);
        } else {
          console.error('Failed to take photo', error);
        }
      }
    }
  };

  const handleCameraError = error => {
    if (error instanceof CameraRuntimeError) {
      Alert.alert('Camera Error', error.message);
    } else {
      console.error('Camera error', error);
    }
  };

  return (
    <View style={styles.container}>
      {isActive && device ? (
        <Camera
          ref={cameraRef}
          style={styles.camera}
          device={device}
          isActive={isActive}
          photo={true}
          onInitialized={() => setIsCameraReady(true)}
          onError={handleCameraError}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text>Camera is not active</Text>
          <Button title="Activate Camera" onPress={handleActivateCamera} />
        </View>
      )}
      {isCameraReady && <Button title="Take Photo" onPress={handleTakePhoto} />}
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
