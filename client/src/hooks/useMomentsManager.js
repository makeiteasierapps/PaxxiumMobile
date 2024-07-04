import {useState, useContext, useEffect} from 'react';
import axios from 'axios';
import {BACKEND_URL, BACKEND_URL_PROD} from '@env';
import {SnackbarContext} from '../contexts/SnackbarContext';
import {useSecureStorage} from './useSecureStorage';

export const useMomentsManager = () => {
  const [moments, setMoments] = useState([]);
  const [currentMoment, setCurrentMoment] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const {storeItem, retrieveItem, deleteMoments} = useSecureStorage();
  const {showSnackbar} = useContext(SnackbarContext);
  const API_KEY = process.env.API_KEY;
  const momentUrl =
    process.env.LOCAL_DEV === 'True'
      ? `${BACKEND_URL}:30001`
      : `${BACKEND_URL_PROD}`;

  const userAgent = process.env.USER_AGENT;

  useEffect(() => {
    // deleteMoments();
    fetchMoments();
  }, []);

  const fetchMoments = async () => {
    setIsLoading(true);
    let momentsData = await retrieveItem('moments');

    if (!momentsData || momentsData.length === 0) {
      try {
        const response = await axios.get(`${momentUrl}/moments`, {
          headers: {
            'User-Agent': userAgent,
          },
        });
        if (response.status === 200 && response.data) {
          momentsData = response.data.moments;
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
        `${momentUrl}/moments`,
        {
          newMoment: moment,
        },
        {
          headers: {
            'User-Agent': userAgent,
          },
        },
      );
      if (response.status === 200 && response.data) {
        const updatedMoments = (await retrieveItem('moments')) || [];
        updatedMoments.push(response.data.moment);
        await storeItem('moments', updatedMoments);
        setMoments(updatedMoments);
        return response.data.moment.momentId;
      }
    } catch (error) {
      console.error('Error adding moment:', error);
      showSnackbar('Error adding moment', 'error');
    }
  };

  const updateMoment = async moment => {
    try {
      const response = await axios.put(
        `${momentUrl}/moments`,
        {
          moment,
        },
        {
          headers: {
            'User-Agent': userAgent,
          },
        },
      );
      if (response.status === 200 && response.data) {
        const updatedMoments = (await retrieveItem('moments')) || [];
        const index = updatedMoments.findIndex(
          item => item.momentId === moment.momentId,
        );
        updatedMoments[index] = response.data.moment;
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
      const response = await axios.delete(`${momentUrl}/moments`, {
        data: {id: momentId},
        headers: {
          'User-Agent': userAgent,
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
    if (currentMoment) {
      console.log('Updating moment:', currentMoment);
      try {
        const momentId = currentMoment.momentId;
        await updateMoment({momentId, transcript, date: new Date()});
      } catch (error) {
        console.error('Error updating moment', error);
      }
    } else {
      console.log('Creating new moment');
      try {
        const newMoment = {
          transcript,
          date: new Date(),
        };
        const newMomentId = await addMoment(newMoment);
        newMoment.momentId = newMomentId;
        setCurrentMoment(newMoment);
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
  };
};
