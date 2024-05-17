import React, {useState, useRef, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import {
  useCameraPermission,
  useCameraDevice,
  useCameraDevices,
  Camera,
  CameraRuntimeError,
} from 'react-native-vision-camera';

import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faCameraRotate} from '@fortawesome/free-solid-svg-icons';

const VisionTab = () => {
  const [isActive, setIsActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [capturedFrame, setCapturedFrame] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWideAngle, setIsWideAngle] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [currentCamera, setCurrentCamera] = useState(null);
  const cameraRef = useRef(null);
  const intervalRef = useRef(null);
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
    setCurrentCamera(isFrontCamera ? frontCamera : backCamera); // Update the current camera device whenever isFrontCamera changes
  }, [isFrontCamera, frontCamera, backCamera]);

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

  const toggleWideAngle = () => {
    setIsWideAngle(prevState => !prevState);
  };

  const toggleCamera = () => {
    setIsFrontCamera(prevState => !prevState);
  };

  const startStreaming = useCallback(() => {
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
  }, [isStreaming, isCameraReady]);

  const selectBestPhoto = photos => {
    // use blur detection to select the clearest photo
    return photos[0]; // Placeholder: return the first photo for now
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleCameraError = useCallback(error => {
    if (error instanceof CameraRuntimeError) {
      Alert.alert('Camera Error', error.message);
    } else {
      console.error('Camera error', error);
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.halfHeight}>
        {isActive && currentCamera ? (
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
            <TouchableOpacity style={styles.iconButton} onPress={toggleCamera}>
              <FontAwesomeIcon icon={faCameraRotate} size={34} color="white" />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.placeholder}>
            <Text>Camera is not active</Text>
          </View>
        )}
      </View>
      <View style={styles.halfHeight}>
        {capturedFrame ? (
          <Image source={{uri: capturedFrame}} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Text>No image captured</Text>
          </View>
        )}
      </View>
      {isCameraReady && (
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
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  halfHeight: {
    flex: 0.5,
  },
  camera: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
  },
  iconButton: {
    position: 'absolute',
    top: 10,
    right: 10,
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

export default VisionTab;
