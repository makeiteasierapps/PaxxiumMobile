#import "AudioChunkPlayer.h"
#import <React/RCTLog.h>

@implementation AudioChunkPlayer {
  AVAudioEngine *_audioEngine;
  AVAudioPlayerNode *_playerNode;
  AVAudioPCMBuffer *_pcmBuffer;
}

RCT_EXPORT_MODULE();

- (instancetype)init {
  self = [super init];
  if (self) {
    _audioEngine = [[AVAudioEngine alloc] init];
    _playerNode = [[AVAudioPlayerNode alloc] init];
    [_audioEngine attachNode:_playerNode];
    
    AVAudioFormat *format = [[AVAudioFormat alloc] initStandardFormatWithSampleRate:44100 channels:1];
    [_audioEngine connect:_playerNode to:_audioEngine.mainMixerNode format:format];
    
    NSError *error;
    [_audioEngine startAndReturnError:&error];
    if (error) {
      RCTLogError(@"Failed to start AVAudioEngine: %@", error);
    }
  }
  return self;
}

RCT_EXPORT_METHOD(playChunk:(NSString *)base64AudioData) {
  RCTLogInfo(@"playChunk called with data: %@", base64AudioData);
  if (!base64AudioData) {
    RCTLogError(@"Received null audio data");
    return;
  }
  
  NSData *audioData = [[NSData alloc] initWithBase64EncodedString:base64AudioData options:0];
  if (!audioData) {
    RCTLogError(@"Failed to decode base64 audio data");
    return;
  }

  RCTLogInfo(@"Decoded audio data length: %lu", (unsigned long)audioData.length);
  
  AVAudioFormat *format = [[AVAudioFormat alloc] initStandardFormatWithSampleRate:44100 channels:1];
  AVAudioPCMBuffer *buffer = [[AVAudioPCMBuffer alloc] initWithPCMFormat:format frameCapacity:(uint32_t)(audioData.length / format.streamDescription->mBytesPerFrame)];
  buffer.frameLength = buffer.frameCapacity;
  memcpy(buffer.floatChannelData[0], audioData.bytes, audioData.length);
  
  [_playerNode scheduleBuffer:buffer completionHandler:nil];
  if (!_playerNode.isPlaying) {
    [_playerNode play];
  }
}

@end
