import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:8000' });

// Добавляем токен в каждый запрос
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const fetchTasks = () => API.get('/tasks/');
export const createTask = (task) => API.post('/tasks/', task);
export const updateTask = (id, task) => API.put(`/tasks/${id}`, task);
export const deleteTask = (id) => API.delete(`/tasks/${id}`);
export const fetchDashboard = () => API.get('/analytics/dashboard');
export const fetchAiSummary = () => API.get('/ai/summary');
export const fetchRiskTasks = () => API.get('/ai/risk_tasks');

export default API;