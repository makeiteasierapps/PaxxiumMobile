import {useState, useCallback, useRef, useContext, useEffect} from 'react';
import {URL} from 'react-native-url-polyfill';
import axios from 'axios';
import {SnackbarContext} from '../contexts/SnackbarContext';
import {AuthContext} from '../contexts/AuthContext';
import {useSecureStorage} from './useSecureStorage';
import {processIncomingStream} from '../components/chat/utils/processIncomingStream.js';
import {io} from 'socket.io-client';
import {BACKEND_URL, BACKEND_URL_PROD, LOCAL_DEV, USER_AGENT} from '@env';

export const useChatManager = () => {
  const {showSnackbar} = useContext(SnackbarContext);
  const {userId} = useContext(AuthContext);
  const {storeItem, retrieveItem, clearLocalChat, deleteLocalChat} =
    useSecureStorage();
  const [chatArray, setChatArray] = useState([]);
  const selectedChatId = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState({});
  const [socket, setSocket] = useState(null);

  const backendUrl =
    LOCAL_DEV === 'true'
      ? `http://${BACKEND_URL}`
      : `https://${BACKEND_URL_PROD}`;
  const wsBackendUrl =
    LOCAL_DEV === 'true' ? `ws://${BACKEND_URL}` : `wss://${BACKEND_URL_PROD}`;

  console.log(backendUrl);

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

  useEffect(() => {
    const newSocket = io(`${wsBackendUrl}`, {
      extraHeaders: {
        'User-Agent': USER_AGENT,
      },
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    newSocket.on('connect_error', error => {
      console.log('Connect error', error);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket && selectedChatId.current) {
      socket.emit('join_room', {chatId: selectedChatId.current});
    }
  }, [socket, selectedChatId.current]);

  // manage messages
  const addMessage = async (chatId, newMessage) => {
    setMessages(prevMessageParts => {
      return {
        ...prevMessageParts,
        [chatId]: [...(prevMessageParts[chatId] || []), newMessage],
      };
    });
  };

  const sendMessage = async (chatId, input) => {
    if (!socket) return;

    try {
      const userMessage = {
        content: input,
        message_from: 'user',
        time_stamp: new Date().toISOString(),
        type: 'database',
      };
      addMessage(chatId, userMessage);

      const chatHistory = getChatHistory(chatId);

      socket.emit('chat_request', {
        chatId: chatId,
        projectId: '666e139da8a159c87447c8c1',
        dbName: 'paxxium',
        chatHistory: chatHistory,
        userMessage: userMessage,
        saveToDb: false,
        createVectorPipeline: true,
      });
    } catch (error) {
      console.error(error);
      showSnackbar(`Network or fetch error: ${error.message}`, 'error');
    }
  };

  const handleStreamingResponse = useCallback(async data => {
    if (data.type === 'end_of_stream') {
      console.log('end of stream');
    } else {
      let newMessageParts;
      setMessages(prevMessages => {
        newMessageParts = processIncomingStream(
          prevMessages,
          selectedChatId.current,
          data,
        );

        storeItem('messages', JSON.stringify(newMessageParts));
        return newMessageParts;
      });

      // Update chatArray state to reflect the new messages
      setChatArray(prevChatArray => {
        const updatedChatArray = prevChatArray.map(chat => {
          if (chat.chatId === selectedChatId.current) {
            return {
              ...chat,
              messages: newMessageParts[selectedChatId.current],
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
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('chat_response', handleStreamingResponse);

    return () => {
      socket.off('chat_response', handleStreamingResponse);
    };
  }, [handleStreamingResponse, socket]);

  // Get the messages for a specific chat
  // Sent in as chat history
  const getChatHistory = chatId => {
    console.log('getChatHistory', messages[chatId]);
    return messages[chatId] || [];
  };

  // manage chat
  const getChats = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      const cachedChats = await retrieveItem('chatArray');
      console.log('cachedChats', cachedChats);
      if (cachedChats && cachedChats.length > 0) {
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
  }, [setChatArray, setMessages, showSnackbar, userId]);

  const fetchChatsFromDB = async () => {
    const response = await axios.get(`${backendUrl}/chat`, {
      headers: {
        userId: userId,
        'User-Agent': USER_AGENT,
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

  const clearChat = async chatId => {
    try {
      const response = await axios.delete(`${backendUrl}/messages`, {
        data: {chatId},
        headers: {
          'User-Agent': USER_AGENT,
        },
      });

      if (response.status !== 200) throw new Error('Failed to clear messages');

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
      const response = await axios.delete(`${backendUrl}/chat`, {
        data: {chatId},
        headers: {
          'User-Agent': USER_AGENT,
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
        `${backendUrl}/chat`,
        {
          model,
          chatName,
          userId,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': USER_AGENT,
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
    selectedChatId,
  };
};
