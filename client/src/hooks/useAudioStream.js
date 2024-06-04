import {useState, useRef, useCallback} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {NativeModules} from 'react-native';
import {useWebSocket} from '../contexts/WebSocketContext';
import LiveAudioStream from 'react-native-live-audio-stream';
import base64 from 'react-native-base64';
import BleManager from 'react-native-ble-manager';

const useAudioStream = (
  onWordDetected,
  onSilenceDetected,
  updateTranscriptState,
) => {
  const [isRecording, setIsRecording] = useState(false);
  const prevVoiceDetectedRef = useRef(false);
  const [streamingTranscript, setStreamingTranscript] = useState('');
  const {ws, initWebSocket} = useWebSocket();
  const serviceUUID = '19B10000-E8F2-537E-4F6C-D104768A1214';
  const audioCharacteristicUUID = '19B10001-E8F2-537E-4F6C-D104768A1214';
  const {CobraVadModule} = NativeModules;

  let audioBuffer = [];

  const startRecording = async () => {
    try {
      console.log('Starting recording...');
      const connectedPeripherals = await BleManager.getConnectedPeripherals([
        serviceUUID,
      ]);
      if (connectedPeripherals.length > 0) {
        console.log('Connected device found, streaming from it');
        initWebSocket(connectedPeripherals[0].id);
      } else {
        console.log('No connected device, streaming from phone');
        initWebSocket();
      }
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = async () => {
    try {
      console.log('Stopping recording...');
      LiveAudioStream.stop();
      if (ws.current) {
        ws.current.send(JSON.stringify({type: 'CloseStream'}));
        ws.current.close();
        console.log('WebSocket connection closed');
      }
      setIsRecording(false);
      setStreamingTranscript('');

      const connectedPeripherals = await BleManager.getConnectedPeripherals([
        serviceUUID,
      ]);
      if (connectedPeripherals.length > 0) {
        try {
          await BleManager.stopNotification(
            connectedPeripherals[0].id,
            serviceUUID,
            audioCharacteristicUUID,
          );
          console.log('Stopped Bluetooth notification');
        } catch (error) {
          console.error('Stop notification error', error);
        }
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const handleSilenceDetected = () => {
    console.log('Silence detected');
    onSilenceDetected && onSilenceDetected(streamingTranscript);
    setStreamingTranscript('');
  };

  const handleWordDetected = transcribedWord => {
    console.log('Word detected:', transcribedWord);
    setStreamingTranscript(prev => prev + ' ' + transcribedWord);
    updateTranscriptState(prev => prev + ' ' + transcribedWord);
    onWordDetected && onWordDetected(transcribedWord);
  };

  const startPhoneStreaming = (onAudioData, customOptions) => {
    try {
      console.log('Starting phone streaming...');
      const defaultOptions = {
        sampleRate: 8000,
        channels: 1,
        bitsPerSample: 16,
        bufferSize: 4096,
      };
      const options = {...defaultOptions, ...customOptions};
      LiveAudioStream.init(options);
      LiveAudioStream.start();
      LiveAudioStream.on('data', base64String => {
        const binaryString = base64.decode(base64String);
        const bytes = new Uint8Array(binaryString.length);

        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const int16Array = new Int16Array(bytes.buffer);
        audioBuffer = audioBuffer.concat(Array.from(int16Array));
        while (audioBuffer.length >= 512) {
          const frame = audioBuffer.splice(0, 512);
          CobraVadModule.processAudioData(frame, (error, voiceDetected) => {
            if (error) {
              console.error('CobraVadModule error:', error);
            } else {
              console.log('Voice detected:', voiceDetected);
              if (prevVoiceDetectedRef.current && !voiceDetected) {
                console.log('Silence detected after voice');
                handleSilenceDetected();
              }
              prevVoiceDetectedRef.current = voiceDetected;
            }
          });
        }

        onAudioData(bytes);
      });

      setIsRecording(true);
    } catch (error) {
      console.error('Error starting phone streaming:', error);
    }
  };

  const startBluetoothStreaming = peripheralId => {
    try {
      console.log('Starting Bluetooth streaming...');
      BleManager.startNotification(
        peripheralId,
        serviceUUID,
        audioCharacteristicUUID,
      )
        .then(() => {
          console.log('Started notification on ' + serviceUUID);
          setIsRecording(true);
        })
        .catch(error => {
          console.error('Notification error:', error);
        });
    } catch (error) {
      console.error('Error starting Bluetooth streaming:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      console.log('useAudioStream focused');
      return () => {
        console.log('useAudioStream unfocused, cleaning up');
        if (ws.current) {
          ws.current.close();
        }
      };
    }, []),
  );

  return {
    isRecording,
    stopRecording,
    startRecording,
    startBluetoothStreaming,
    startPhoneStreaming,
    handleWordDetected,
  };
};

export default useAudioStream;
