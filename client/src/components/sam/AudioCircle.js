import {useState, useRef, useCallback, useEffect} from 'react';
import {View, StyleSheet, TouchableOpacity, Text} from 'react-native';
import useAudioStream from '../../hooks/useAudioStream';
import Sound from 'react-native-sound';
import {
  BuiltInKeywords,
  PorcupineManager,
} from '@picovoice/porcupine-react-native';
import RNFS from 'react-native-fs';
import {useFocusEffect} from '@react-navigation/native';
import {BACKEND_URL, BACKEND_URL_PROD} from '@env';

const AudioCircle = () => {
  const [displayText, setDisplayText] = useState('');
  const [streamingTranscript, setStreamingTranscript] = useState('');
  const porcupineRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const API_KEY = process.env.API_KEY;
  const samUrl =
    process.env.LOCAL_DEV === 'True' ? BACKEND_URL : BACKEND_URL_PROD;

  const processErrorCallback = error => {
    console.error('Porcupine Error:', error);
  };

  const playSound = (filePath, basePath = Sound.MAIN_BUNDLE, onComplete) => {
    console.log('Initializing sound playback');
    Sound.setCategory('Playback', true);
    const sound = new Sound(filePath, basePath, error => {
      if (error) {
        console.error('Failed to load the sound', error);
        return;
      }
      sound.setVolume(1);
      sound.play(success => {
        if (!success) {
          console.error('Sound playback failed');
        } else {
          console.log('Sound playback succeeded');
          if (onComplete) {
            onComplete();
          }
        }
        console.log('Releasing sound resource');
        sound.release();
      });
    });
  };

  const detectionCallback = async keywordIndex => {
    if (porcupineRef.current && keywordIndex >= 0) {
      try {
        await playGreetingAndCleanup();
        startRecording();
      } catch (error) {
        console.error('Error during detection callback:', error);
      }
    }
  };

  const playGreetingAndCleanup = async () => {
    return new Promise(async (resolve, reject) => {
      try {
        await porcupineRef.current.stop();
        console.log('Stopping porcupine');
        await porcupineRef.current.delete();
        console.log('Porcupine cleanup complete');
        playSound('greeting1Nova.mp3', Sound.MAIN_BUNDLE, () => {
          resolve();
        });
      } catch (error) {
        console.error('Error during porcupine cleanup:', error);
        reject(error);
      }
    });
  };

  const initPorcupine = async () => {
    try {
      const accessKey = process.env.PICO_ACCESS_KEY;
      porcupineRef.current = await PorcupineManager.fromBuiltInKeywords(
        accessKey,
        [BuiltInKeywords.COMPUTER],
        detectionCallback,
        processErrorCallback,
      );
      await porcupineRef.current.start();
    } catch (err) {
      console.error('Failed to initialize Porcupine', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      console.log('Component focused, initializing Porcupine');
      console.log(samUrl);
      initPorcupine();

      return () => {
        if (porcupineRef.current) {
          porcupineRef.current.stop().then(() => {
            porcupineRef.current.delete();
          });
        }
        stopRecording();
        Sound.setCategory('Ambient'); // Reset the category when the component loses focus
      };
    }, []),
  );

  const handleWordDetected = word => {
    // Start or reset the timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    startTimeRef.current = Date.now();
    timerRef.current = true;
  };

  useEffect(() => {
    if (streamingTranscript) {
      handleSilenceDetected(streamingTranscript);
    }
  }, [streamingTranscript]);

  const handleSilenceDetected = async message => {
    stopRecording();

    if (timerRef.current) {
      const timeTosilence = Date.now() - startTimeRef.current;
      console.log(`Silence detected after ${timeTosilence} ms`);
    }

    console.log('Silence detected, sending message:', message);

    try {
      const response = await fetch(`${samUrl}/sam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({newMessage: message}),
      });

      if (response.ok) {
        setStreamingTranscript('');

        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64data = reader.result;
          const path = `${RNFS.DocumentDirectoryPath}/audio.mp3`;
          await RNFS.writeFile(path, base64data.split(',')[1], 'base64');
          // Stop the timer and log the elapsed time
          console.log(timerRef.current);
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            const elapsedTime = Date.now() - startTimeRef.current;
            console.log(`Total time: ${elapsedTime} ms`);
            timerRef.current = null;
            startTimeRef.current = null;
          }
          playSound(path, null, () => {
            startRecording();
          });
        };
        reader.readAsDataURL(blob);
      } else {
        startRecording(); // Add a voice response saying there was an error
        throw new Error('Network response was not ok.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const {startRecording, stopRecording} = useAudioStream(
    handleWordDetected,
    handleSilenceDetected,
    setStreamingTranscript,
  );

  return (
    <View>
      <TouchableOpacity style={[styles.circle, {width: 200, height: 200}]} />
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
