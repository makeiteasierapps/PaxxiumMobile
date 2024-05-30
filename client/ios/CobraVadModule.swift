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
            if let accessKey = ProcessInfo.processInfo.environment["PICO_ACCESS_KEY"] {
                handle = try Cobra(accessKey: accessKey) // Initialize the handle with your access key
            } else {
                print("COBRA_ACCESS_KEY not set in environment variables")
            }
        } catch {
            print("Error initializing Cobra handle: \(error.localizedDescription)")
        }
    }

    @objc
    static func requiresMainQueueSetup() -> Bool {
        return true
    }
    @objc
    func processAudioData(_ audioData: [Int16]) {
        do {
            guard let handle = self.handle else { return }
            let voiceProbability = try handle.process(pcm: audioData)
            if voiceProbability > self.threshold {
                print("Voice detected")
            } else {
                print("No voice detected")
            }
        } catch {
            print("Error processing audio frame: \(error.localizedDescription)")
        }
    }
}