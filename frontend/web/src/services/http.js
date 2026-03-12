import axios from 'axios';

function normalizarUrlBase(url) {
  if (!url) {
    return url;
  }

  return url.trim().replace(/\/+$/, '');
}

const apiUrl = import.meta.env.VITE_API_URL;
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const fallbackApiProducao = 'https://api-qnf-mvp-hxeufubybfcgefcq.brazilsouth-01.azurewebsites.net';

let baseURL = '/api';

if (apiBaseUrl) {
  baseURL = normalizarUrlBase(apiBaseUrl);
} else if (apiUrl) {
  baseURL = `${normalizarUrlBase(apiUrl)}/api`;
} else if (import.meta.env.PROD) {
  baseURL = `${fallbackApiProducao}/api`;
}

export const http = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export function definirTokenAutorizacao(token) {
  if (token) {
    http.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete http.defaults.headers.common.Authorization;
  }
}
