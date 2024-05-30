#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(CobraVadModule, NSObject)

RCT_EXTERN_METHOD(processAudioData:(NSArray<NSNumber *> *)audioData)

@end