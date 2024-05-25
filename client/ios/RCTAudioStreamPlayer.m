#import "RCTAudioStreamPlayer.h"
#import <React/RCTLog.h>
#import <Foundation/Foundation.h>

@implementation RCTAudioStreamPlayer {
  AVAudioEngine *_audioEngine;
  AVAudioPlayerNode *_playerNode;
  AVAudioPCMBuffer *_pcmBuffer;
}

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

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
      NSLog(@"Failed to start AVAudioEngine: %@", error);
    }
  }
  return self;
}

RCT_EXPORT_METHOD(playChunk:(NSArray<NSNumber *> *)audioDataArray) {
  NSLog(@"playChunk method was called with data length: %lu", (unsigned long)[audioDataArray count]);

  if (!_audioEngine.isRunning) {
    NSError *error;
    [_audioEngine startAndReturnError:&error];
    if (error) {
      NSLog(@"Failed to start AVAudioEngine: %@", error);
      return;
    }
  }

  NSUInteger length = [audioDataArray count];
  int16_t *audioData = (int16_t *)malloc(length * sizeof(int16_t));
  for (NSUInteger i = 0; i < length; i++) {
    audioData[i] = [audioDataArray[i] shortValue];
  }

  // Create an audio format with the correct sample rate and channel count
  AVAudioFormat *format = [[AVAudioFormat alloc] initWithCommonFormat:AVAudioPCMFormatInt16 sampleRate:44100 channels:1 interleaved:YES];
  
  // Calculate frame capacity
  uint32_t frameCapacity = (uint32_t)(length / format.streamDescription->mBytesPerFrame);
  NSLog(@"Calculated frame capacity: %u", frameCapacity);

  // Ensure frame capacity is valid
  if (frameCapacity == 0) {
    NSLog(@"Error: Frame capacity is zero");
    free(audioData);
    return;
  }

  AVAudioPCMBuffer *buffer = [[AVAudioPCMBuffer alloc] initWithPCMFormat:format frameCapacity:frameCapacity];
  buffer.frameLength = buffer.frameCapacity;

  if (buffer.int16ChannelData != NULL) {
    // Copy audio data into the buffer's int16ChannelData
    memcpy(buffer.int16ChannelData[0], audioData, length * sizeof(int16_t));
  } else {
    NSLog(@"Error: buffer.int16ChannelData is NULL");
    free(audioData);
    return;
  }
  free(audioData);

  NSLog(@"Scheduling buffer with length: %u", buffer.frameLength);
  [_playerNode scheduleBuffer:buffer completionHandler:^{
    NSLog(@"Buffer playback completed");
  }];
  
  if (!_playerNode.isPlaying) {
    NSLog(@"Starting player node");
    [_playerNode play];
  } else {
    NSLog(@"Player node is already playing");
  }
}

@end
