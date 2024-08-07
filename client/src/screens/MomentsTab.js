import {useContext, useRef, useEffect, useState} from 'react';
import jsTokens from 'js-tokens';
import {useNavigation} from '@react-navigation/native';
import {ScrollView, Text, StyleSheet, FlatList} from 'react-native';
import {Button} from 'react-native-elements';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {MomentsContext} from '../contexts/MomentsContext';
import useAudioStream from '../hooks/useAudioStream';
import MomentListItem from '../components/moments/MomentsListItem';
import {SafeAreaView} from 'react-native-safe-area-context';

const MomentsTab = () => {
  const streamingTranscript = useRef('');
  const [displayTranscript, setDisplayTranscript] = useState('');
  const {moments, createOrUpdateMoment, currentMoment} = useContext(MomentsContext);
  const tokenCount = useRef(0);

  const countTokens = text => {
    const token_count = Array.from(jsTokens(text)).length;
    return token_count;
  };

  const handleSilenceDetected = () => {
    console.log('Silence detected in MomentsTab');
  };

  const handleWordDetected = transcribedWord => {
    const tokens = countTokens(transcribedWord);
    tokenCount.current += tokens;
    streamingTranscript.current += ' ' + transcribedWord;

    if (tokenCount.current >= 100) {
      createOrUpdateMoment(streamingTranscript.current);
      streamingTranscript.current = '';
      tokenCount.current = 0;
    }
  };

  const {isRecording, stopRecording, startRecording} = useAudioStream(
    handleWordDetected,
    handleSilenceDetected,
    setDisplayTranscript,
  );

  const scrollViewRef = useRef(null);
  const navigation = useNavigation();

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({animated: true});
  }, [displayTranscript]);

  const handlePress = momentId => {
    navigation.navigate('Moment Details', {momentId});
  };

  const handleRecordPress = () => {
    if (isRecording) {
      createOrUpdateMoment(displayTranscript);
      stopRecording();
      currentMoment.current = null;
    } else {
      startRecording();
    }
  };

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaView style={styles.container}>
        <Button
          title={isRecording ? 'Stop' : 'Record'}
          onPress={handleRecordPress}
          buttonStyle={styles.recordButton}
        />
        <ScrollView ref={scrollViewRef} style={styles.transcriptContainer}>
          <Text style={styles.transcriptText}>{displayTranscript}</Text>
        </ScrollView>
        <FlatList
          data={moments}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({item}) => {
            return (
              <MomentListItem
                momentId={item.momentId}
                onItemPress={handlePress}
              />
            );
          }}
          style={{flex: 1}}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  recordButton: {
    padding: 20,
    margin: 20,
    width: 200,
    alignSelf: 'center',
    backgroundColor: 'red',
    borderRadius: 50,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  transcriptContainer: {
    height: 200,
    maxHeight: 200,
    margin: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 5,
    backgroundColor: '#f9f9f9',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },

  transcriptText: {
    fontSize: 16,
  },
});

export default MomentsTab;
