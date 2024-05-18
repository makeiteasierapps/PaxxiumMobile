import React, {useState} from 'react';
import {View, Text, StyleSheet, Image} from 'react-native';
import {useIsFocused} from '@react-navigation/native';

import CameraComponent from '../components/camera/Camera';

const VisionTab = () => {
  const [capturedFrame, setCapturedFrame] = useState(null);
  const isFocused = useIsFocused();
  console.log('isFocused', isFocused);
  return (
    <View style={styles.container}>
      {isFocused && (
        <CameraComponent
          setCapturedFrame={setCapturedFrame}
          isFocused={isFocused}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default VisionTab;
