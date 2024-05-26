import {NativeModules} from 'react-native';
export const playChunk = audioData => {
  const {AudioStreamPlayer} = NativeModules;
  AudioStreamPlayer.playChunk(audioData);
};
