import {useState, useContext, useEffect, useRef} from 'react';
import axios from 'axios';
import {BACKEND_URL, BACKEND_URL_PROD, LOCAL_DEV, USER_AGENT} from '@env';
import {SnackbarContext} from '../contexts/SnackbarContext';
import {useSecureStorage} from './useSecureStorage';

export const useMomentsManager = () => {
  const [moments, setMoments] = useState([]);
  const currentMoment = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const {storeItem, retrieveItem, deleteMoments} = useSecureStorage();
  const {showSnackbar} = useContext(SnackbarContext);

  const backendUrl = LOCAL_DEV === 'true' ? `http://${BACKEND_URL}` : `https://${BACKEND_URL_PROD}`;

  useEffect(() => {
    // deleteMoments();
    fetchMoments();
  }, []);

  const fetchMoments = async () => {
    setIsLoading(true);
    let momentsData = await retrieveItem('moments');

    if (!momentsData || momentsData.length === 0) {
      try {
        const response = await axios.get(`${backendUrl}/moments`, {
          headers: {
            'User-Agent': USER_AGENT,
          },
        });
        if (response.status === 200 && response.data) {
          momentsData = response.data;
          await storeItem('moments', momentsData);
        }
      } catch (error) {
        console.error('Error fetching moments:', error);
        showSnackbar('Error fetching moments', 'error');
      }
    }

    setMoments(momentsData);
    setIsLoading(false);
  };

  const addMoment = async moment => {
    try {
      const response = await axios.post(
        `${backendUrl}/moments`,
        {
          newMoment: moment,
        },
        {
          headers: {
            'User-Agent': USER_AGENT,
          },
        },
      );
      if (response.status === 200 && response.data) {
        const updatedMoments = (await retrieveItem('moments')) || [];
        updatedMoments.push(response.data);
        await storeItem('moments', updatedMoments);
        setMoments(updatedMoments);
        return response.data.momentId;
      }
    } catch (error) {
      console.error('Error adding moment:', error);
      showSnackbar('Error adding moment', 'error');
    }
  };

  const updateMoment = async moment => {
    try {
      const response = await axios.put(
        `${backendUrl}/moments`,
        {
          moment,
        },
        {
          headers: {
            'User-Agent': USER_AGENT,
          },
        },
      );
      if (response.status === 200 && response.data) {
        const updatedMoments = (await retrieveItem('moments')) || [];
        const index = updatedMoments.findIndex(
          item => item.momentId === moment.momentId,
        );
        updatedMoments[index] = response.data;
        await storeItem('moments', updatedMoments);
        setMoments(updatedMoments);
      }
    } catch (error) {
      console.error('Error updating moment:', error);
      showSnackbar('Error updating moment', 'error');
    }
  };

  const deleteMoment = async momentId => {
    try {
      const response = await axios.delete(`${backendUrl}/moments`, {
        data: {id: momentId},
        headers: {
          'User-Agent': USER_AGENT,
        },
      });
      if (response.status === 200) {
        let updatedMoments = (await retrieveItem('moments')) || [];
        updatedMoments = updatedMoments.filter(
          item => item.momentId !== momentId,
        );
        await storeItem('moments', updatedMoments);
        setMoments(updatedMoments);
      }
    } catch (error) {
      console.error('Error deleting moment:', error);
      showSnackbar('Error deleting moment', 'error');
    }
  };

  const createOrUpdateMoment = async transcript => {
    if (currentMoment.current) {
      console.log('updating moment');
      try {
        const momentId = currentMoment.current.momentId;
        await updateMoment({momentId, transcript, date: new Date()});
      } catch (error) {
        console.error('Error updating moment', error);
      }
    } else {
      console.log('creating moment');
      try {
        const newMoment = {
          transcript,
          date: new Date(),
        };
        const newMomentId = await addMoment(newMoment);
        newMoment.momentId = newMomentId;
        currentMoment.current = newMoment;
      } catch (error) {
        console.error('Error creating moment', error);
      }
    }
  };

  return {
    moments,
    isLoading,
    fetchMoments,
    addMoment,
    updateMoment,
    deleteMoment,
    createOrUpdateMoment,
    currentMoment,
  };
};
