import React, {useState, useRef, useEffect, useCallback, useMemo} from 'react';
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
  useCameraDevices,
  Camera,
  CameraRuntimeError,
} from 'react-native-vision-camera';

const VisionTab = () => {
  const [isActive, setIsActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [capturedFrame, setCapturedFrame] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWideAngle, setIsWideAngle] = useState(false);
  const [currentFormat, setCurrentFormat] = useState(null);
  const cameraRef = useRef(null);
  const intervalRef = useRef(null);
  const {hasPermission, requestPermission} = useCameraPermission();
  const devices = useCameraDevices();

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

  const format = useMemo(() => {
    if (devices) {
      const backDevices = devices.filter(device => device.position === 'back');
      console.log(backDevices);
    }
    return null;
  }, [devices]);

  const getWidestFormat = () => {
    if (devices) {
      console.debug(devices.formats);
      return devices.formats.sort((a, b) => b.fieldOfView - a.fieldOfView)[0];
    }
    return null;
  };

  const selectCamerasForZoomLevels = devices => {
    let wideAngleCamera = null;
    let standardCamera = null;
    let telephotoCamera = null;

    // Sorting devices by minZoom to find the wide-angle and standard camera
    devices.sort((a, b) => a.minZoom - b.minZoom);
    wideAngleCamera = devices.find(device =>
      device.physicalDevices.includes('ultra-wide-angle-camera'),
    ); // Closest to 0.5x
    standardCamera = devices.find(device => device.minZoom === 1);

    // Sorting devices by maxZoom to find the telephoto camera
    devices.sort((a, b) => b.maxZoom - a.maxZoom);
    telephotoCamera = devices.find(device => device.maxZoom >= 3);

    return {wideAngleCamera, standardCamera, telephotoCamera};
  };

  const selectedCameras = selectCamerasForZoomLevels(devices);
  console.log(selectedCameras);

  if (selectedCameras.wideAngleCamera) {
    const formats = selectedCameras.wideAngleCamera.formats;
    console.log(formats); // This will log all available formats for the wide-angle camera
  }

  const toggleWideAngle = () => {
    setIsWideAngle(prevState => !prevState);
    const newFormat = isWideAngle ? format : getWidestFormat();
    setCurrentFormat(newFormat);
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
        {isActive && devices ? (
          <Camera
            ref={cameraRef}
            style={styles.camera}
            device={devices}
            isActive={isActive}
            photo={true}
            onInitialized={() => setIsCameraReady(true)}
            onError={handleCameraError}
            format={format}
            videoStabilizationMode={'auto'}
            photoHdr={true}
          />
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
    backgroundColor: 'green',
  },
  buttonWideAngleActive: {
    backgroundColor: 'yellow',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
});

export default VisionTab;
