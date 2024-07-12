import {useState, useContext, useEffect} from 'react';
import {v4 as uuidv4} from 'uuid';
import {SnackbarContext} from '../contexts/SnackbarContext';
import {useSecureStorage} from './useSecureStorage';

export const useAuthentication = () => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [uid, setUid] = useState(null);
  const {showSnackbar} = useContext(SnackbarContext);
  const {storeItem, retrieveItem} = useSecureStorage();

  useEffect(() => {
    const rehydrateUser = async () => {
      const users = await retrieveItem('users');
      const loggedInUser = Object.values(users).find(user => user.isLoggedIn);
      if (loggedInUser) {
        setUid(loggedInUser.userId);
        setIsAuthorized(true);
        setLoggedIn(true);
      }
    };

    rehydrateUser();
  }, []);

  const registerUser = async userInfo => {
    const newUserId = uuidv4();
    userInfo['userId'] = newUserId;
    userInfo['isLoggedIn'] = true;
    try {
      let users = await retrieveItem('users');
      if (!users) {
        users = {};
      }
      users[newUserId] = userInfo;
      await storeItem('users', users);
      setIsAuthorized(true);
      setLoggedIn(true);
      setUid(newUserId);
    } catch (error) {
      showSnackbar('Error storing the user info', 'error');
      console.error('Error storing the user info', error);
    }
  };

  const signOut = async () => {
    let users = await retrieveItem('users');
    const loggedInUser = Object.values(users).find(user => user.isLoggedIn);
    if (loggedInUser) {
      loggedInUser.isLoggedIn = false;
      await storeItem('users', users);
    }
    setIsAuthorized(false);
    setLoggedIn(false);
    setUid(null);
  };

  const signIn = async (email, password) => {
    let users = await retrieveItem('users');
    console.log('users', users);
    const user = Object.values(users).find(
      user => user.email === email && user.password === password,
    );
    if (user) {
      user.isLoggedIn = true;
      await storeItem('users', users);
      setIsAuthorized(true);
      setLoggedIn(true);
      setUid(user.userId);
      showSnackbar('Login successful', 'success');
    } else {
      showSnackbar('Invalid credentials', 'error');
    }
  };

  return {
    isAuthorized,
    loggedIn,
    uid,
    registerUser,
    signOut,
    signIn,
    setIsLoading,
    isLoading,
  };
};
