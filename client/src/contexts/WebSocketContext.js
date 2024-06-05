import React, {createContext, useRef} from 'react';
import {DEEPGRAM_API_KEY} from '@env';

export const WebSocketContext = createContext();

export const WebSocketProvider = ({children}) => {
  const ws = useRef(null);

  const initWebSocket = async ({
    peripheralId,
    startBluetoothStreaming,
    startPhoneStreaming,
    handleWordDetected,
  }) => {
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

  return (
    <WebSocketContext.Provider value={{ws, initWebSocket}}>
      {children}
    </WebSocketContext.Provider>
  );
};
