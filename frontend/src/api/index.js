import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('arintu_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('arintu_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const auth = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
};

export const users = {
  list: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  get: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  remove: (id) => api.delete(`/users/${id}`),
};

export const classes = {
  list: (params) => api.get('/classes', { params }),
  create: (data) => api.post('/classes', data),
  get: (id) => api.get(`/classes/${id}`),
  update: (id, data) => api.put(`/classes/${id}`, data),
  remove: (id) => api.delete(`/classes/${id}`),
  setPricing: (id, data) => api.post(`/classes/${id}/pricing`, data),
  assignTeacher: (id, teacherId) => api.post(`/classes/${id}/assign-teacher`, { teacherId }),
  removeTeacher: (id, teacherId) => api.delete(`/classes/${id}/remove-teacher/${teacherId}`),
  enroll: (id, studentId, paymentStatus) => api.post(`/classes/${id}/enroll`, { studentId, paymentStatus }),
  unenroll: (id, studentId) => api.delete(`/classes/${id}/unenroll/${studentId}`),
  enrollments: (id) => api.get(`/classes/${id}/enrollments`),
};

export const schedules = {
  list: (params) => api.get('/schedules', { params }),
  create: (data) => api.post('/schedules', data),
  get: (id) => api.get(`/schedules/${id}`),
  update: (id, data) => api.put(`/schedules/${id}`, data),
  remove: (id) => api.delete(`/schedules/${id}`),
  createZoom: (id) => api.post(`/schedules/${id}/zoom`),
};

export const notifications = {
  list: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export const regions = {
  list: () => api.get('/regions'),
  create: (data) => api.post('/regions', data),
  remove: (id) => api.delete(`/regions/${id}`),
};

export const countries = {
  list: () => api.get('/countries'),
  create: (data) => api.post('/countries', data),
  remove: (id) => api.delete(`/countries/${id}`),
  fees: () => api.get('/countries/fees'),
  setFee: (countryId, fee) => api.put(`/countries/fees/${countryId}`, { fee }),
};

export const applications = {
  list: (params) => api.get('/applications', { params }),
  apply: (classId, countryCode) => api.post('/applications', { classId, countryCode }),
  approve: (id) => api.put(`/applications/${id}/approve`),
  reject: (id, notes) => api.put(`/applications/${id}/reject`, { notes }),
};

export const publicApi = {
  classes: (countryCode) => api.get('/public/classes', { params: { countryCode } }),
  applicationFee: (countryCode) => api.get('/public/application-fee', { params: { countryCode } }),
};

export const pricing = {
  list: () => api.get('/pricing'),
  create: (data) => api.post('/pricing', data),
  update: (id, data) => api.put(`/pricing/${id}`, data),
  remove: (id) => api.delete(`/pricing/${id}`),
};

export const mathwave = {
  status: () => api.get('/mathwave/status'),
  sync: (classId) => api.post(`/mathwave/sync/${classId}`),
  results: (studentId, classId) => api.get(`/mathwave/results/${studentId}`, { params: { classId } }),
};

export default api;
