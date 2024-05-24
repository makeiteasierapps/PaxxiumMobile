import { NativeModules } from 'react-native';

const playChunk = base64Data => {
  const {CalendarModule} = NativeModules;
  console.log('Playing chunk:', base64Data);
  if (CalendarModule) {
    console.log('AudioChunkPlayer module is available');
    // AudioChunkPlayer.playChunk(base64Data);
  } else {
    console.error('AudioChunkPlayer module is not available');
  }
};

export default playChunk;
