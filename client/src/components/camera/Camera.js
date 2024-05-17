import {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import {
  useCameraPermission,
  useCameraDevice,
  Camera,
  CameraRuntimeError,
} from 'react-native-vision-camera';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faCameraRotate} from '@fortawesome/free-solid-svg-icons';

const CameraComponent = ({cameraRef, isWideAngle, setIsCameraReady}) => {
  const [isActive, setIsActive] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [currentCamera, setCurrentCamera] = useState(null);
  const {hasPermission, requestPermission} = useCameraPermission();

  const backCamera = useCameraDevice('back', {
    physicalDevices: [
      'ultra-wide-angle-camera',
      'wide-angle-camera',
      'telephoto-camera',
    ],
  });

  const frontCamera = useCameraDevice('front', {
    physicalDevices: ['wide-angle-camera'],
  });

  useEffect(() => {
    const checkPermissions = async () => {
      if (!hasPermission) {
        const status = await requestPermission();
        if (status !== 'granted') {
          Alert.alert('Camera permission is required');
        } else {
          setIsActive(true);
        }
      } else {
        setIsActive(true);
      }
    };

    checkPermissions();
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    setCurrentCamera(isFrontCamera ? frontCamera : backCamera);
  }, [isFrontCamera, frontCamera, backCamera]);

  if (!isActive || !currentCamera) {
    console.log(isActive, currentCamera);
    return (
      <View style={styles.placeholder}>
        <Text>Camera is not active</Text>
      </View>
    );
  }

  const toggleFrontCamera = () => {
    setIsFrontCamera(prevState => !prevState);
  };

  const handleCameraError = error => {
    if (error instanceof CameraRuntimeError) {
      Alert.alert('Camera Error', error.message);
    } else {
      console.error('Camera error', error);
    }
  };

  return (
    <>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={currentCamera}
        isActive={isActive}
        photo={true}
        onInitialized={() => setIsCameraReady(true)}
        onError={handleCameraError}
        zoom={isWideAngle ? currentCamera.minZoom : currentCamera.neutralZoom}
        videoStabilizationMode={'auto'}
        photoHdr={true}
      />
      <TouchableOpacity style={styles.iconButton} onPress={toggleFrontCamera}>
        <FontAwesomeIcon icon={faCameraRotate} size={34} color="white" />
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  camera: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 10,
  },
});

export default CameraComponent;
