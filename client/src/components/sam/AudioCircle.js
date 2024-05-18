import React, {useState, useEffect} from 'react';
import {View, StyleSheet, TouchableOpacity, Text} from 'react-native';
import useAudioStream from '../../hooks/useAudioStream';

const AudioCircle = () => {
  const [circleSize, setCircleSize] = useState(200);
  const [displayText, setDisplayText] = useState('');

  const handleWordDetected = word => {
    console.log('Word detected:', word);
  };

  const handleSilenceDetected = () => {
    console.log('Silence detected');
  };

  const {startRecording, stopRecording, isRecording} = useAudioStream(
    handleWordDetected,
    handleSilenceDetected,
    setDisplayText,
  );

  const handlePress = () => {
    if (isRecording) {
      setCircleSize(200);
      stopRecording();
      return;
    }
    setCircleSize(prevSize => (prevSize === 200 ? 300 : 200));
    startRecording();
  };
  return (
    <View>
      <TouchableOpacity
        style={[styles.circle, {width: circleSize, height: circleSize}]}
        onPress={handlePress}
      />
      <Text>{displayText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    backgroundColor: 'black',
    borderRadius: 100,
    margin: 20,
  },
});

export default AudioCircle;
