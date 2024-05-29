import Foundation
import AVFoundation
import Cobra

@objc(CobraVadModule)
class CobraVadModule: NSObject {
    private var audioEngine: AVAudioEngine?
    private var inputNode: AVAudioInputNode?
    private var bus: Int = 0
    private var frameLength: Int = 512
    private var threshold: Float = 0.1
    private var handle: Cobra? // Define the handle

    override init() {
        super.init()
        do {
            handle = try Cobra(accessKey: "") // Initialize the handle with your access key
        } catch {
            print("Error initializing Cobra handle: \(error.localizedDescription)")
        }
    }

    @objc
    func startListening() {
        audioEngine = AVAudioEngine()
        inputNode = audioEngine?.inputNode
        guard let inputNode = inputNode else { return }

        let format = inputNode.inputFormat(forBus: bus)
        let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(frameLength))!

        var audioFrame: [Int16] = []

        inputNode.installTap(onBus: bus, bufferSize: AVAudioFrameCount(frameLength), format: format) { (buffer, time) in
            let channelData = buffer.int16ChannelData![0]
            for i in 0..<Int(buffer.frameLength) {
                audioFrame.append(channelData[i])
            }
        }

        audioEngine?.prepare()
        do {
            try audioEngine?.start()
        } catch {
            print("Error starting audio engine: \(error.localizedDescription)")
            return
        }

        DispatchQueue.global().async {
            while true {
                do {
                    guard let handle = self.handle else { return }
                  let voiceProbability = try handle.process(pcm: audioFrame)
                    if voiceProbability > self.threshold {
                        print("Voice detected")
                    } else {
                        print("No voice detected")
                    }
                } catch {
                    print("Error processing audio frame")
                }
            }
        }
    }

    @objc
    func stopListening() {
        audioEngine?.stop()
        inputNode?.removeTap(onBus: bus)
    }
}
