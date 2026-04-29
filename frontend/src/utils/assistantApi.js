import axios from 'axios';
import { normalizeApiError } from './api';

export const chatWithAssistant = async (payload) => {
  try {
    const response = await axios.post('/api/ai/chat', payload);
    return response.data || {};
  } catch (error) {
    throw normalizeApiError(error, 'Assistant request failed');
  }
};
