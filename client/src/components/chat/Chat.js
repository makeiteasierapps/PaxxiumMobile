import React, {useContext, useEffect, useRef} from 'react';
import {
  ScrollView,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
} from 'react-native';
import {ChatContext} from '../../contexts/ChatContext';
import AgentMessage from './AgentMessage';
import MessageInput from './MessageInput';
import UserMessage from './UserMessage';
import ChatBar from './ChatBar';

const Chat = ({route}) => {
  const {chat_name: chatName, chatId} = route.params;
  const nodeRef = useRef(null);
  const {messages, selectedChatId} = useContext(ChatContext);
  useEffect(() => {
    selectedChatId.current = chatId;

    return () => {
      selectedChatId.current = null;
    };
  }, []);

  // scrolls chat window to the bottom
  useEffect(() => {
    const node = nodeRef.current;
    if (node) {
      node.scrollToEnd({animated: true});
    }
  }, [messages]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}>
        <ChatBar chatName={chatName} chatId={chatId} />
        <ScrollView ref={nodeRef} style={styles.messagesContainer}>
          {messages[chatId]?.map((message, index) => {
            if (message.message_from === 'user') {
              return <UserMessage key={`user${index}`} message={message} />;
            }
            return <AgentMessage key={`stream${index}`} message={message} />;
          })}
        </ScrollView>
        <MessageInput chatId={chatId} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  messagesContainer: {
    flex: 1,
  },
});

export default Chat;
