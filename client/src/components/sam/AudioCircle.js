import React, {useState, useRef} from 'react';
import {View, StyleSheet, TouchableOpacity, Text} from 'react-native';
import useAudioStream from '../../hooks/useAudioStream';
import playChunk from '../../utils/AudioChunkPlayer';

import {BACKEND_URL} from '@env';

const AudioCircle = () => {
  const [circleSize, setCircleSize] = useState(200);
  const [displayText, setDisplayText] = useState('');

  const handleWordDetected = word => {
    console.log('Word detected:', word);
  };

  let accumulatedChunks = [];

  const handleSilenceDetected = async () => {
    console.log('Silence detected');
    setDisplayText('');
    try {
      const response = await fetch(`${BACKEND_URL}:30002/sam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newMessage: displayText,
        }),
      });

      if (response.ok) {
        const reader = response.body.getReader();

        reader.read().then(function processStream({done, value}) {
          if (done) {
            console.log('Stream completed');
            return;
          }
          console.log('Received chunk:', value);

          // Accumulate chunks
          accumulatedChunks.push(value);

          // Periodically send accumulated chunks
          if (accumulatedChunks.length >= 10) {
            // Adjust the threshold as needed
            const combinedChunks = new Uint8Array(accumulatedChunks);
            const base64String = btoa(String.fromCharCode(...combinedChunks));
            playChunk(base64String);
            accumulatedChunks = []; // Reset the accumulator
          }

          return reader.read().then(processStream);
        });
      } else {
        throw new Error('Network response was not ok.');
      }
    } catch (error) {
      console.error('Error fetching moments:', error);
      showSnackbar('Error fetching moments', 'error');
    }
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
