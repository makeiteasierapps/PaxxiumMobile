import {useState, useEffect, useRef} from 'react';
import {useIsFocused} from '@react-navigation/core';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  AppState,
} from 'react-native';
import {
  useCameraPermission,
  useCameraDevice,
  Camera,
  CameraRuntimeError,
} from 'react-native-vision-camera';

import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faCameraRotate, faCamera} from '@fortawesome/free-solid-svg-icons';

const useIsForeground = () => {
  const [isForeground, setIsForeground] = useState(true);

  useEffect(() => {
    const onChange = state => {
      setIsForeground(state === 'active');
    };
    const listener = AppState.addEventListener('change', onChange);
    return () => listener.remove();
  }, [setIsForeground]);

  return isForeground;
};

const CameraComponent = ({setCapturedFrame, isFocused}) => {
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [currentCamera, setCurrentCamera] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWideAngle, setIsWideAngle] = useState(true);
  const cameraRef = useRef(null);
  const intervalRef = useRef(null);
  const {hasPermission, requestPermission} = useCameraPermission();

  const isForeground = useIsForeground();
  const isActive = isFocused && isForeground;

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
    setCurrentCamera(isFrontCamera ? frontCamera : backCamera);
  }, [isFrontCamera, frontCamera, backCamera]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

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
  const toggleWideAngle = () => {
    setIsWideAngle(prevState => !prevState);
  };

  const startStreaming = () => {
    if (isStreaming) {
      clearInterval(intervalRef.current);
      setIsStreaming(false);
      return;
    }
    setIsStreaming(true);
    if (isCameraReady) {
      intervalRef.current = setInterval(async () => {
        if (cameraRef.current) {
          const photos = await Promise.all([
            cameraRef.current.takePhoto({quality: 'high', skipMetadata: true}),
            cameraRef.current.takePhoto({quality: 'high', skipMetadata: true}),
            cameraRef.current.takePhoto({quality: 'high', skipMetadata: true}),
          ]);
          const bestPhoto = selectBestPhoto(photos);
          setCapturedFrame(bestPhoto.path);
        }
      }, 3000);
    }
  };

  const selectBestPhoto = photos => {
    // use blur detection to select the clearest photo
    return photos[0]; // Placeholder: return the first photo for now
  };
  return (
    <>
      {currentCamera && (
        <>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            device={currentCamera}
            isActive={isActive}
            photo={true}
            onInitialized={() => setIsCameraReady(true)}
            onError={handleCameraError}
            zoom={
              isWideAngle ? currentCamera.minZoom : currentCamera.neutralZoom
            }
            videoStabilizationMode={'auto'}
            photoHdr={true}
          />
          <TouchableOpacity
            style={styles.iconButton}
            onPress={toggleFrontCamera}>
            <FontAwesomeIcon icon={faCameraRotate} size={34} color="white" />
          </TouchableOpacity>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, isStreaming && styles.buttonStreaming]}
              onPress={startStreaming}
            />
            <TouchableOpacity
              style={[
                styles.button,
                styles.wideAngleButton,
                isWideAngle && styles.buttonWideAngleActive,
              ]}
              onPress={toggleWideAngle}>
              <Text style={styles.buttonText}>.5</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
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
  buttonContainer: {
    position: 'absolute',
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    bottom: 20,
    padding: 10,
  },
  button: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'blue',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 10,
  },
  buttonStreaming: {
    backgroundColor: 'red',
  },
  wideAngleButton: {
    backgroundColor: 'blue',
  },
  buttonWideAngleActive: {
    backgroundColor: 'green',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
});

export default CameraComponent;
