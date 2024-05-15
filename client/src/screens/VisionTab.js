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
  useCameraDevice,
  Camera,
  CameraRuntimeError,
} from 'react-native-vision-camera';

const VisionTab = () => {
  const [isActive, setIsActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [capturedFrame, setCapturedFrame] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const cameraRef = useRef(null);
  const intervalRef = useRef(null);
  const device = useCameraDevice('back');
  const {hasPermission, requestPermission} = useCameraPermission();

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
    if (device) {
      return device.formats
        .filter(
          f =>
            f.videoStabilizationModes && f.videoStabilizationModes.length > 0,
        )
        .sort(
          (a, b) => b.photoWidth * b.photoHeight - a.photoWidth * a.photoHeight,
        )[0];
    }
    return null;
  }, [device]);

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
          const photo = await cameraRef.current.takePhoto({
            quality: 'high',
            skipMetadata: true,
          });
          setCapturedFrame(photo.path);
        }
      }, 3000);
    }
  }, [isStreaming, isCameraReady]);

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
        {isActive && device ? (
          <Camera
            ref={cameraRef}
            style={styles.camera}
            device={device}
            isActive={isActive}
            photo={true}
            onInitialized={() => setIsCameraReady(true)}
            onError={handleCameraError}
            format={format}
            videoStabilizationMode={format?.videoStabilizationModes[0]}
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
        <TouchableOpacity
          style={[styles.button, isStreaming && styles.buttonStreaming]}
          onPress={startStreaming}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  halfHeight: {
    width: '100%',
    height: '50%',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ccc',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  button: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'blue',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
  },
  buttonStreaming: {
    backgroundColor: 'red',
  },
});
export default VisionTab;
