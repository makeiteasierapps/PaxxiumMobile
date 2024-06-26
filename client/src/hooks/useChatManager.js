import {useState, useCallback, useRef, useContext, useEffect} from 'react';
import axios from 'axios';
import {SnackbarContext} from '../contexts/SnackbarContext';
import {AuthContext} from '../contexts/AuthContext';
import {useSecureStorage} from './useSecureStorage';
import {processToken} from '../components/chat/utils/processToken';
import {BACKEND_URL, BACKEND_URL_PROD} from '@env';

export const useChatManager = () => {
  const {showSnackbar} = useContext(SnackbarContext);
  const {userId} = useContext(AuthContext);
  const {storeItem, retrieveItem, clearLocalChat, deleteLocalChat} =
    useSecureStorage();
  const [chatArray, setChatArray] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState({});
  const [insideCodeBlock, setInsideCodeBlock] = useState(false);
  const ignoreNextTokenRef = useRef(false);
  const languageRef = useRef(null);

  const API_KEY = process.env.API_KEY;
  const chatUrl =
    process.env.LOCAL_DEV === 'True'
      ? `${BACKEND_URL}:30000`
      : BACKEND_URL_PROD;

  useEffect(() => {
    setIsLoading(true);
    getChats()
      .then(() => {
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching chats:', error);
        setIsLoading(false);
      });
  }, [userId]);

  const addMessage = async (chatId, newMessage) => {
    setMessages(prevMessageParts => {
      return {
        ...prevMessageParts,
        [chatId]: [...(prevMessageParts[chatId] || []), newMessage],
      };
    });
  };

  const getChats = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      const cachedChats = await retrieveItem('chatArray');
      if (cachedChats) {
        setChatArray(cachedChats);

        const cachedMessages = cachedChats.reduce((acc, chat) => {
          if (chat.messages) {
            acc[chat.chatId] = chat.messages;
          }
          return acc;
        }, {});
        setMessages(cachedMessages);

        // Check if the messages object is empty and if so, fetch from the database
        if (Object.values(cachedMessages).length === 0) {
          return fetchChatsFromDB();
        }

        return cachedChats;
      } else {
        // No cached chats, fetch from the database
        return fetchChatsFromDB();
      }
    } catch (error) {
      console.error(error);
      showSnackbar(`Network or fetch error: ${error.message}`, 'error');
    }
  }, [chatUrl, setChatArray, setMessages, showSnackbar, userId]);

  const fetchChatsFromDB = async () => {
    const response = await axios.get(`${chatUrl}/chatMobile`, {
      headers: {
        userId: userId,
        'X-API-Key': API_KEY,
      },
    });

    if (response.status !== 200)
      throw new Error('Failed to load user conversations');

    const data = response.data;
    setChatArray(data);

    const messagesFromData = data.reduce((acc, chat) => {
      if (chat.messages) {
        acc[chat.chatId] = chat.messages;
      }
      return acc;
    }, {});
    setMessages(messagesFromData);

    await storeItem('chatArray', data);
    return data;
  };

  const sendMessage = async (chatId, input) => {
    const userMessage = {
      content: input,
      message_from: 'user',
      time_stamp: new Date().toISOString(),
      type: 'database',
    };
    addMessage(chatId, userMessage);

    const chatHistory = await getMessages(chatId);

    try {
      const response = await sendUserMessage(chatId, userMessage, chatHistory);
      await handleStreamingResponse(response, chatId);
    } catch (error) {
      console.error(error);
      showSnackbar(`Network or fetch error: ${error.message}`, 'error');
    }
  };

  // using fetch instead of axios because axios doesn't support streaming
  const sendUserMessage = async (chatId, userMessage, chatHistory) => {
    const response = await fetch(`${chatUrl}/chatMobile/messages`, {
      reactNative: {textStreaming: true},
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({
        chatId: chatId,
        saveToDb: false,
        dbName: 'friend',
        chatHistory: chatHistory,
        userMessage: userMessage,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    return response;
  };

  const handleStreamingResponse = async (response, chatId) => {
    const reader = response.body.getReader();
    let completeMessage = '';
    while (true) {
      const {done, value} = await reader.read();
      if (done) {
        break;
      }
      const decodedValue = new TextDecoder('utf-8').decode(value);
      const jsonChunks = decodedValue
        .split('\n')
        .filter(line => line.trim() !== '');

      const messages = jsonChunks.map(chunk => {
        const messageObj = JSON.parse(chunk);
        processToken(
          messageObj,
          setInsideCodeBlock,
          insideCodeBlock,
          setMessages,
          chatId,
          ignoreNextTokenRef,
          languageRef,
        );
        return messageObj.content;
      });
      completeMessage += messages.join('');
    }
    await updateMessagesStateAndStorage(chatId, completeMessage);
  };

  const updateMessagesStateAndStorage = async (chatId, completeMessage) => {
    setMessages(prevMessages => {
      const updatedMessages = [
        ...(prevMessages[chatId] || []).slice(0, -1),
        {
          content: completeMessage,
          message_from: 'agent',
          type: 'database',
        },
      ];

      const newMessagesState = {
        ...prevMessages,
        [chatId]: updatedMessages,
      };

      // Update chatArray state to reflect the new messages
      setChatArray(prevChatArray => {
        const updatedChatArray = prevChatArray.map(chat => {
          if (chat.chatId === chatId) {
            return {
              ...chat,
              messages: updatedMessages,
            };
          }
          return chat;
        });

        // Save updated chatArray to local storage
        (async () => {
          try {
            await storeItem('chatArray', updatedChatArray);
          } catch (error) {
            console.error('Failed to save chat array:', error);
          }
        })();

        return updatedChatArray;
      });

      return newMessagesState;
    });
  };

  const clearChat = async chatId => {
    try {
      const response = await axios.delete(`${chatUrl}/chatMobile/messages`, {
        data: {chatId},
        headers: {
          'X-API-Key': API_KEY,
        },
      });

      if (!response.ok) throw new Error('Failed to clear messages');

      // Update the chatArray state
      setChatArray(prevChatArray => {
        const updatedChatArray = prevChatArray.map(chat => {
          if (chat.chatId === chatId) {
            return {...chat, messages: []};
          }
          return chat;
        });

        return updatedChatArray;
      });

      await clearLocalChat(chatId);

      // Update the messages state for the UI to reflect the cleared messages
      setMessages(prevMessages => {
        const updatedMessages = {...prevMessages, [chatId]: []};
        // No need to update 'messages' in local storage since it's part of 'chatArray'
        return updatedMessages;
      });
    } catch (error) {
      console.error(error);
      showSnackbar(`Network or fetch error: ${error.message}`, 'error');
    }
  };

  const deleteChat = async chatId => {
    try {
      const response = await axios.delete(`${chatUrl}/chatMobile`, {
        data: {chatId},
        headers: {
          'X-API-Key': API_KEY,
        },
      });

      if (response.status !== 200)
        throw new Error('Failed to delete conversation');

      setChatArray(prevChatArray => {
        const updatedChatArray = prevChatArray.filter(
          chatObj => chatObj.chatId !== chatId,
        );

        return updatedChatArray;
      });

      await deleteLocalChat(chatId);
    } catch (error) {
      console.error(error);
      showSnackbar(`Network or fetch error: ${error.message}`, 'error');
    }
  };

  const createChat = async (model, chatName, userId) => {
    try {
      const response = await axios.post(
        `${chatUrl}/chatMobile`,
        {
          model,
          chatName,
          userId,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
          },
        },
      );

      if (response.status !== 200) throw new Error('Failed to create chat');

      const data = await response.data;
      // Update the chatArray directly here
      setChatArray(prevChats => {
        const updatedChatArray = [data, ...prevChats];
        return updatedChatArray;
      });
      const updatedChatArray = [data, ...chatArray];
      await storeItem('chatArray', updatedChatArray);
    } catch (error) {
      console.error(error);
      showSnackbar(`Network or fetch error: ${error.message}`, 'error');
    }
  };

  // Get the messages for a specific chat
  // Sent in as chat history
  const getMessages = chatId => {
    return messages[chatId] || [];
  };

  return {
    chatArray,
    setChatArray,
    messages,
    sendMessage,
    clearChat,
    deleteChat,
    createChat,
    getChats,
    isLoading,
  };
};
