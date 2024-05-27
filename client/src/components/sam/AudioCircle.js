import React, {useState, useRef, useEffect} from 'react';
import {View, StyleSheet, TouchableOpacity, Text} from 'react-native';
import useAudioStream from '../../hooks/useAudioStream';
import Sound from 'react-native-sound';
import {Porcupine, BuiltInKeywords} from '@picovoice/porcupine-react-native';
import RNFS from 'react-native-fs';
import {playChunk} from '../../utils/AudioChunkPlayer';
import {BACKEND_URL, BACKEND_URL_PROD} from '@env';

const AudioCircle = () => {
  const [circleSize, setCircleSize] = useState(200);
  const [displayText, setDisplayText] = useState('');
  const wordDetected = useRef(false);
  const porcupineRef = useRef(null);
  const API_KEY = process.env.API_KEY;
  const samUrl =
    process.env.LOCAL_DEV === 'True'
      ? `${BACKEND_URL}:30002`
      : `${BACKEND_URL_PROD}`;

  useEffect(() => {
    const initPorcupine = async () => {
      try {
        const accessKey = process.env.PICO_ACCESS_KEY; // Your Picovoice access key
        porcupineRef.current = await Porcupine.fromBuiltInKeywords(accessKey, [
          BuiltInKeywords.COMPUTER,
        ]);
      } catch (err) {
        console.error('Failed to initialize Porcupine', err);
      }
    };

    initPorcupine();

    return () => {
      if (porcupineRef.current) {
        porcupineRef.current.delete();
      }
    };
  }, []);

  const handleWordDetected = word => {
    console.log('Word detected:', word);
    wordDetected.current = true;
  };

  const handleSilenceDetected = async message => {
    console.log(wordDetected.current);
    if (wordDetected.current) {
      console.log('Silence detected sending message:', message);
      wordDetected.current = false;
      try {
        const response = await fetch(`${samUrl}/sam`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
          },
          body: JSON.stringify({
            newMessage: message,
          }),
        });

        if (response.ok) {
          setDisplayText('');
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64data = reader.result;
            const path = `${RNFS.DocumentDirectoryPath}/audio.mp3`;
            await RNFS.writeFile(path, base64data.split(',')[1], 'base64');
            console.log('File written to:', path);
            Sound.setCategory('Playback');
            const sound = new Sound(path, null, error => {
              if (error) {
                console.error('Failed to load the sound', error);
                return;
              }
              sound.setVolume(1);
              sound.play(success => {
                if (!success) {
                  console.error('Sound playback failed');
                }
              });
            });
          };
          reader.readAsDataURL(blob);

          // const reader = response.body.getReader();
          // let accumulatedChunks = [];
          // const processStream = async ({done, value}) => {
          //   if (done) {
          //     console.log('Stream completed');

          //     const CHUNK_SIZE = 2000; // Define a reasonable chunk size

          //     // Convert accumulated Uint8Array chunks to Int16Array
          //     const uint8Array = new Uint8Array(accumulatedChunks.flat());
          //     const int16Array = new Int16Array(uint8Array.buffer);

          //     // Split the Int16Array into smaller chunks
          //     for (let i = 0; i < int16Array.length; i += CHUNK_SIZE) {
          //       const chunk = int16Array.slice(i, i + CHUNK_SIZE);
          //       const int16ArrayForNative = Array.from(chunk);
          //       playChunk(int16ArrayForNative);
          //     }
          //     return;
          //   }
          //   accumulatedChunks.push(value);
          //   return reader.read().then(processStream);
          // };

          // reader.read().then(processStream);
        } else {
          throw new Error('Network response was not ok.');
        }
      } catch (error) {
        console.error('Error fetching moments:', error);
        showSnackbar('Error fetching moments', 'error');
      }
    }
  };

  const {startRecording, stopRecording, isRecording, startPhoneStreaming} =
    useAudioStream(handleWordDetected, handleSilenceDetected, setDisplayText);

  const handlePress = () => {
    if (isRecording) {
      setCircleSize(200);
      stopRecording();
      return;
    }
    setCircleSize(prevSize => (prevSize === 200 ? 300 : 200));
    startRecording();
  };

  useEffect(() => {
    const processAudioFrame = async buffer => {
      if (porcupineRef.current) {
        try {
          const keywordIndex = await porcupineRef.current.process(
            new Int16Array(buffer),
          );
          if (keywordIndex >= 0) {
            console.log('Wake word detected!');

            // Play the MP3 file
            const sound = new Sound(
              'genAudio/greeting1Nova.mp3',
              Sound.MAIN_BUNDLE,
              error => {
                if (error) {
                  console.error('Failed to load the sound', error);
                  return;
                }
                Sound.setCategory('Playback');
                sound.setVolume(1);
                sound.play(success => {
                  if (!success) {
                    console.error('Sound playback failed');
                  }
                });
              },
            );
          }
        } catch (e) {
          console.error('Error processing audio frame', e);
        }
      }
    };

    const customOptions = {
      bufferSize: 512,
    };
    startPhoneStreaming(processAudioFrame, customOptions);
  }, [startPhoneStreaming]);

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
