import {useState, useRef, useEffect, useContext} from 'react';
import {BluetoothContext} from '../contexts/BluetoothContext';
import BleManager from 'react-native-ble-manager';
import LiveAudioStream from 'react-native-live-audio-stream';
import base64 from 'base-64';
import {DEEPGRAM_API_KEY} from '@env';

function useAudioStreamer() {
  const [isRecording, setIsRecording] = useState(false);
  const [streamingTranscript, setStreamingTranscript] = useState('');
  const wsRef = useRef(null);
  const {bleManagerEmitter} = useContext(BluetoothContext);

  // Constants for UUIDs
  const serviceUUID = '19B10000-E8F2-537E-4F6C-D104768A1214';
  const audioCharacteristicUUID = '19B10001-E8F2-537E-4F6C-D104768A1214';

  // Ref for peripheral ID for reuse
  const peripheralIdRef = useRef(null);

  // Refs for managing state of silences
  const silenceTimerRef = useRef(null);
  const isSilenceTimerActiveRef = useRef(false);

  // Function to initialize event listeners
  useEffect(() => {
    const handleUpdateValueForCharacteristic = data => {
      const array = new Uint8Array(data.value);
      const audioData = array.subarray(3);
      wsRef.current.send(audioData.buffer);
    };

    bleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      handleUpdateValueForCharacteristic,
    );

    return () => {
      bleManagerEmitter.removeListener(
        'BleManagerDidUpdateValueForCharacteristic',
        handleUpdateValueForCharacteristic,
      );
    };
  }, [bleManagerEmitter]);

  // Event handlers and helpers for WebSocket
  const configureWebSocket = url => {
    wsRef.current = new WebSocket(url, ['token', DEEPGRAM_API_KEY]);

    wsRef.current.onopen = () => {
      console.log('WebSocket connection opened');
      if (peripheralIdRef.current) {
        startBluetoothStreaming(peripheralIdRef.current);
      } else {
        startPhoneStreaming();
      }
    };

    wsRef.current.onerror = error => {
      console.error('WebSocket error:', error);
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket connection closed');
    };

    wsRef.current.onmessage = event => {
      const dataObj = JSON.parse(event.data);
      const transcribedWord = dataObj?.channel?.alternatives?.[0]?.transcript;

      if (transcribedWord) {
        clearTimeout(silenceTimerRef.current);
        isSilenceTimerActiveRef.current = false;
        setStreamingTranscript(prev => `${prev} ${transcribedWord}`);
      } else {
        if (!isSilenceTimerActiveRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            handleCreateMoment();
            restartRecording();
          }, 5000); // consider adjusting time as needed

          isSilenceTimerActiveRef.current = true;
        }
      }
    };
  };

  const handleCreateMoment = () => {
    console.log('Moment created'); // Replace with actual implementation
  };

  const restartRecording = () => {
    if (peripheralIdRef.current) {
      startBluetoothStreaming(peripheralIdRef.current);
    } else {
      startPhoneStreaming();
    }
  };

  const startBluetoothStreaming = peripheralId => {
    BleManager.startNotification(
      peripheralId,
      serviceUUID,
      audioCharacteristicUUID,
    )
      .then(() => {
        console.log(`Started notification on ${serviceUUID}`);
        setIsRecording(true);
      })
      .catch(error => {
        console.log('Notification error:', error);
      });
  };

  const startPhoneStreaming = () => {
    const options = {
      sampleRate: 8000,
      channels: 1,
      bitsPerSample: 16,
      bufferSize: 4096,
    };

    LiveAudioStream.init(options);
    LiveAudioStream.on('data', base64String => {
      const binaryString = base64.decode(base64String);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      wsRef.current.send(bytes.buffer);
    });

    LiveAudioStream.start();
    setIsRecording(true);
  };

  const stopRecording = async () => {
    try {
      LiveAudioStream.stop();
      setIsRecording(false);
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({type: 'CloseStream'}));
        wsRef.current.close();
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const startRecording = async () => {
    const connectedDevices = await BleManager.getConnectedPeripherals([
      serviceUUID,
    ]);
    if (connectedDevices.length > 0) {
      peripheralIdRef.current = connectedDevices[0].id;
      const urlParams = new URLSearchParams({
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        encoding: 'linear16',
        sample_rate: 8000,
      });
      const url = `wss://api.deepgram.com/v1/listen?${urlParams.toString()}`;
      configureWebSocket(url);
    } else {
      peripheralIdRef.current = null;
      startPhoneStreaming();
    }
  };

  return {
    startRecording,
    stopRecording,
    isRecording,
    streamingTranscript,
  };
}

export default useAudioStreamer;
