import React, {useState} from 'react';
import {View, Text, StyleSheet, Image, TouchableOpacity} from 'react-native';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faEye} from '@fortawesome/free-solid-svg-icons';

import CameraComponent from '../components/camera/Camera';
import AudioCircle from '../components/sam/AudioCircle';

const SamTab = () => {
  const [capturedFrame, setCapturedFrame] = useState(null);
  const [isCameraVisible, setIsCameraVisible] = useState(false);

  const toggleCameraVisibility = () => {
    setIsCameraVisible(!isCameraVisible);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.icon} onPress={toggleCameraVisibility}>
        <FontAwesomeIcon icon={faEye} size={24} />
      </TouchableOpacity>
      {isCameraVisible && <CameraComponent setCapturedFrame={setCapturedFrame} />}
      <AudioCircle />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 1,
  },
});

export default SamTab;