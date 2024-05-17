import React, {useState, useRef, useEffect, useCallback} from 'react';
import {View, Text, StyleSheet, Image, TouchableOpacity} from 'react-native';

import CameraComponent from '../components/camera/Camera';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faCameraRotate, faCamera} from '@fortawesome/free-solid-svg-icons';

const VisionTab = () => {
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [capturedFrame, setCapturedFrame] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWideAngle, setIsWideAngle] = useState(true);
  const cameraRef = useRef(null);
  const intervalRef = useRef(null);

  const toggleWideAngle = () => {
    setIsWideAngle(prevState => !prevState);
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

  return (
    <View style={styles.container}>
      <View style={styles.halfHeight}>
        <CameraComponent
          {...{
            cameraRef,
            isWideAngle,
            setIsCameraReady,
          }}
        />
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
