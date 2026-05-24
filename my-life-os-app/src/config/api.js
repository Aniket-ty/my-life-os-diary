import axios from 'axios';

export const API_BASE_URL = 'https://my-life-os-diary.onrender.com/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});
