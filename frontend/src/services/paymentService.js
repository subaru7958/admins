import { API_BASE_URL } from '../config/config';

export const getPaymentSchedule = async ({ sessionId, subjectType }) => {
  const res = await fetch(`${API_BASE_URL}/api/payments/${sessionId}/schedule?subjectType=${subjectType}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to load payment schedule');
  }
  const data = await res.json();
  return data.data; // { months, schedule }
};

export const setPaymentStatus = async ({ sessionId, subjectId, subjectType, year, month, status, amount, notes }) => {
  const res = await fetch(`${API_BASE_URL}/api/payments/${sessionId}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ subjectId, subjectType, year, month, status, amount, notes }),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to update payment status');
  }
  const data = await res.json();
  return data.data;
};

export const markPaid = async ({ sessionId, subjectId, subjectType, amount, year, month, notes }) => {
  const res = await fetch(`${API_BASE_URL}/api/payments/${sessionId}/mark-paid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ subjectId, subjectType, amount, year, month, notes }),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to record payment');
  }
  const data = await res.json();
  return data.data;
};


