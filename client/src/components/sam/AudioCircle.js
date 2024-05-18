import React, {useState, useRef} from 'react';
import {View, StyleSheet, TouchableOpacity, Text} from 'react-native';
import useAudioStream from '../../hooks/useAudioStream';

const AudioCircle = () => {
  const [circleSize, setCircleSize] = useState(200);
  const [displayText, setDisplayText] = useState('');
  const silenceTimerRef = useRef(null);

  const handleWordDetected = word => {
    console.log('Word detected:', word);
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const handleSilenceDetected = () => {
    console.log('Silence detected');
    silenceTimerRef.current = setTimeout(() => {
      console.log('3 seconds of silence detected');
      // Execute your function here
    }, 3000);
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
