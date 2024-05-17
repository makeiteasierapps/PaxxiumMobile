import React, {useState} from 'react';
import {View, Text, StyleSheet, Image} from 'react-native';

import CameraComponent from '../components/camera/Camera';

const VisionTab = () => {
  const [capturedFrame, setCapturedFrame] = useState(null);

  return (
    <View style={styles.container}>
      <CameraComponent setCapturedFrame={setCapturedFrame} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default VisionTab;
