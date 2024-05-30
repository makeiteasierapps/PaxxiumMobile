#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(CobraVadModule, NSObject)

RCT_EXTERN_METHOD(startListening)
RCT_EXTERN_METHOD(stopListening)

@end