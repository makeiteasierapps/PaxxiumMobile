import {useState, useRef, useEffect, useContext} from 'react';
import {NativeModules} from 'react-native';
import {DEEPGRAM_API_KEY} from '@env';
import {BluetoothContext} from '../contexts/BluetoothContext';
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
  const streamingTranscript = useRef('');
  const ws = useRef(null);
  const {bleManagerEmitter} = useContext(BluetoothContext);
  const serviceUUID = '19B10000-E8F2-537E-4F6C-D104768A1214';
  const audioCharacteristicUUID = '19B10001-E8F2-537E-4F6C-D104768A1214';
  const {CobraVadModule} = NativeModules;

  let audioBuffer = [];
  // This is the function responsible for handling the data received from the Bluetooth device
  const handleUpdateValueForCharacteristic = data => {
    const array = new Uint8Array(data.value);
    // for some reason the firmware sends 3 bytes of garbage data at the beginning
    const modifiedArray = array.slice(3);
    ws.current.send(modifiedArray.buffer);
  };

  const startRecording = async () => {
    // Check for connected Bluetooth peripherals
    const connectedPeripherals = await BleManager.getConnectedPeripherals([
      serviceUUID,
    ]);
    if (connectedPeripherals.length > 0) {
      // If theres a connected device then we stream from it
      initWebSocket(connectedPeripherals[0].id);
    } else {
      // If no connected device then we stream from phone
      initWebSocket();
    }
  };

  const stopRecording = async () => {
    LiveAudioStream.stop();
    if (ws.current) {
      ws.current.send(JSON.stringify({type: 'CloseStream'}));
      ws.current.close();
      console.log('WebSocket connection closed');
    }
    setIsRecording(false);

    if (streamingTranscript.current) {
      updateTranscriptState('');
    }

    // Stop Bluetooth streaming if it was started
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
  };

  const handleSilenceDetected = () => {
    onSilenceDetected && onSilenceDetected(streamingTranscript.current);
    streamingTranscript.current = '';
  };

  const handleWordDetected = transcribedWord => {
    streamingTranscript.current += ' ' + transcribedWord;
    updateTranscriptState(prev => prev + ' ' + transcribedWord);
    onWordDetected && onWordDetected(transcribedWord);
  };

  const initWebSocket = async peripheralId => {
    const model = 'nova-2';
    const language = 'en-US';
    const smart_format = true;
    const encoding = 'linear16';
    const sample_rate = 8000;

    const url = `wss://api.deepgram.com/v1/listen?model=${model}&language=${language}&smart_format=${smart_format}&encoding=${encoding}&sample_rate=${sample_rate}`;
    ws.current = new WebSocket(url, ['token', DEEPGRAM_API_KEY]);

    ws.current.onopen = () => {
      console.log('WebSocket connection opened');
      if (peripheralId) {
        startBluetoothStreaming(peripheralId);
      } else {
        startPhoneStreaming(audioData => {
          ws.current.send(audioData);
        });
      }
    };

    ws.current.onmessage = event => {
      const dataObj = JSON.parse(event.data);
      const transcribedWord = dataObj?.channel?.alternatives?.[0]?.transcript;
      if (transcribedWord) {
        handleWordDetected(transcribedWord);
      }
    };
  };

  const startPhoneStreaming = (onAudioData, customOptions) => {
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
            console.error(error);
          } else {
            // Check for transition from voice detected to silence detected
            console.log('Voice detected:', voiceDetected);
            if (prevVoiceDetectedRef.current && !voiceDetected) {
              console.log('Silence detected after voice');
              handleSilenceDetected();
              // Process the transcript stored in the ref
              const transcript = streamingTranscript.current;
              if (transcript) {
                // Process the transcript here
                console.log('Processing transcript:', transcript);
                // Clear the transcript after processing
                streamingTranscript.current = '';
              }
            }
            prevVoiceDetectedRef.current = voiceDetected;
          }
        });
      }

      // Send the raw audio data to the API continuously
      onAudioData(bytes);
    });

    setIsRecording(true);
  };
  const startBluetoothStreaming = peripheralId => {
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
        console.log('Notification error', error);
      });
  };

  // Add listener for Bluetooth data updates
  useEffect(() => {
    bleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      handleUpdateValueForCharacteristic,
    );

    return () => {
      bleManagerEmitter.removeAllListeners(
        'BleManagerDidUpdateValueForCharacteristic',
      );
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  return {
    isRecording,
    initWebSocket,
    stopRecording,
    startRecording,
  };
};
export default useAudioStream;
