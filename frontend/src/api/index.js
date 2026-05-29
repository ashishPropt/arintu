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
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
  verifyResetToken: (token) => api.get('/auth/verify-reset-token', { params: { token } }),
};

export const users = {
  list: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  get: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  remove: (id) => api.delete(`/users/${id}`),
  pendingApproval: () => api.get('/users/pending-approval'),
  approveAccount: (id) => api.put(`/users/${id}/approve-account`),
  rejectAccount: (id, notes) => api.put(`/users/${id}/reject-account`, { notes }),
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
  apply: (classId, countryCode, scholarshipRequested, scholarshipType) =>
    api.post('/applications', { classId, countryCode, scholarshipRequested, scholarshipType }),
  approve: (id) => api.put(`/applications/${id}/approve`),
  reject: (id, notes) => api.put(`/applications/${id}/reject`, { notes }),
  awardScholarship: (id, type, discountPct) =>
    api.put(`/applications/${id}/scholarship`, { type, discountPct }),
};

export const payments = {
  verify: (sessionId) => api.get(`/payments/verify/${sessionId}`),
  cancelPending: (applicationId) => api.delete(`/payments/cancel/${applicationId}`),
};

export const waivers = {
  request: (reason) => api.post('/waivers', { reason }),
  getMyStatus: () => api.get('/waivers/me'),
  list: (params) => api.get('/waivers', { params }),
  review: (userId, action, notes) => api.put(`/waivers/${userId}/review`, { action, notes }),
};

export const verification = {
  uploadId: (file) => {
    const fd = new FormData();
    fd.append('id_document', file);
    return api.post('/verification/upload-id', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  status: () => api.get('/verification/status'),
  list: (status) => api.get('/verification', { params: status ? { status } : {} }),
  approve: (userId) => api.put(`/verification/${userId}/approve`),
  reject: (userId, notes) => api.put(`/verification/${userId}/reject`, { notes }),
};

export const worksheets = {
  list: (classId) => api.get('/worksheets', { params: { classId } }),
  create: (formData) => api.post('/worksheets', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, formData) => api.put(`/worksheets/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  remove: (id) => api.delete(`/worksheets/${id}`),
  download: (id) => api.get(`/worksheets/${id}/download`, { responseType: 'blob' }),
};

export const publicApi = {
  classes: (countryCode) => api.get('/public/classes', { params: { countryCode } }),
  applicationFee: (countryCode) => api.get('/public/application-fee', { params: { countryCode } }),
  team: () => api.get('/public/team'),
  cities: () => api.get('/public/cities'),
  countries: () => api.get('/public/countries'),
  books: () => api.get('/public/books'),
};

export const content = {
  // Team (superadmin)
  getTeam: () => api.get('/content/team'),
  createTeamMember: (data) => api.post('/content/team', data),
  updateTeamMember: (id, data) => api.put(`/content/team/${id}`, data),
  deleteTeamMember: (id) => api.delete(`/content/team/${id}`),
  // Cities (superadmin)
  getCities: () => api.get('/content/cities'),
  createCity: (data) => api.post('/content/cities', data),
  updateCity: (id, data) => api.put(`/content/cities/${id}`, data),
  deleteCity: (id) => api.delete(`/content/cities/${id}`),
  // Books (superadmin + authenticated users)
  getBooks: () => api.get('/content/books'),
  submitBook: (data) => api.post('/content/books', data),
  reviewBook: (id, status, notes) => api.put(`/content/books/${id}/review`, { status, admin_notes: notes }),
  deleteBook: (id) => api.delete(`/content/books/${id}`),
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
