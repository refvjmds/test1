// API utility functions for authenticated requests

export const makeAuthenticatedRequest = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = localStorage.getItem('sessionToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
};

export const apiGet = (url: string): Promise<Response> => {
  return makeAuthenticatedRequest(url, { method: 'GET' });
};

export const apiPost = (url: string, data?: any): Promise<Response> => {
  return makeAuthenticatedRequest(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
};

export const apiDelete = (url: string): Promise<Response> => {
  return makeAuthenticatedRequest(url, { method: 'DELETE' });
};

export const apiPut = (url: string, data?: any): Promise<Response> => {
  return makeAuthenticatedRequest(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
};
