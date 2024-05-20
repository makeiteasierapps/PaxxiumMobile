import {NativeModules} from 'react-native';
const {AudioChunkPlayer} = NativeModules;

const playChunk = base64Data => {
  AudioChunkPlayer.playChunk(base64Data);
};

export default {
  playChunk,
};
