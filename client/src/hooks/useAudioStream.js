import {useState, useRef, useContext} from 'react';
import {NativeModules} from 'react-native';
import {WebSocketContext} from '../contexts/WebSocketContext';
import LiveAudioStream from 'react-native-live-audio-stream';
import base64 from 'react-native-base64';
import BleManager from 'react-native-ble-manager';

const useAudioStream = (onWordDetected, onSilenceDetected, setTranscript) => {
  const [isRecording, setIsRecording] = useState(false);
  const prevVoiceDetectedRef = useRef(false);
  const {ws, initWebSocket} = useContext(WebSocketContext);
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
        await initWebSocket({
          peripheralId: connectedPeripherals[0].id,
          startBluetoothStreaming,
          startPhoneStreaming,
          handleWordDetected,
        });
      } else {
        console.log('No connected device, streaming from phone');
        await initWebSocket({
          startBluetoothStreaming,
          startPhoneStreaming,
          handleWordDetected,
        });
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
      setTranscript('');

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

  const handleSilenceDetected = userMessage => {
    if (!userMessage) {
      return;
    }
    onSilenceDetected && onSilenceDetected(userMessage);
    setTranscript('');
  };

  const handleWordDetected = transcribedWord => {
    console.log('Word detected:', transcribedWord);
    setTranscript(prev => prev + ' ' + transcribedWord);
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

        // This is specific to SAM, extract the logic and then conditionally run it
        // depending on if Moments is using the streaming or if SAM is. I dont need to 
        // detect silence. I want to start and stop Moments with the button press. So when
        // Stop recording is triggered the transcribed message will then be added as a new moment.
        const int16Array = new Int16Array(bytes.buffer);
        audioBuffer = audioBuffer.concat(Array.from(int16Array));
        while (audioBuffer.length >= 512) {
          const frame = audioBuffer.splice(0, 512);
          CobraVadModule.processAudioData(frame, (error, voiceDetected) => {
            if (error) {
              console.error('CobraVadModule error:', error);
            } else {
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
