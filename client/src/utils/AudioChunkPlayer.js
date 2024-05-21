import {NativeModules} from 'react-native';
const {AudioChunkPlayer} = NativeModules;

const playChunk = base64Data => {
  console.log('Playing chunk:', base64Data);
  if (AudioChunkPlayer) {
    console.log('AudioChunkPlayer module is available');
    // AudioChunkPlayer.playChunk(base64Data);
  } else {
    console.error('AudioChunkPlayer module is not available');
  }
};

export default playChunk;
