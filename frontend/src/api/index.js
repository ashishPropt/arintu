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
  // 2FA
  twoFaStatus: () => api.get('/auth/2fa/status'),
  twoFaSetup: () => api.post('/auth/2fa/setup'),
  twoFaEnable: (code) => api.post('/auth/2fa/enable', { code }),
  twoFaDisable: (password, code) => api.post('/auth/2fa/disable', { password, code }),
  twoFaVerify: (pendingToken, code) => api.post('/auth/2fa/verify', { pendingToken, code }),
  updateProfile: (data) => api.put('/auth/profile', data),
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
  bulkZoom: (classId) => api.post('/schedules/bulk-zoom', { classId }),
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
  update: (id, data) => api.put(`/countries/${id}`, data),
  remove: (id) => api.delete(`/countries/${id}`),
  fees: () => api.get('/countries/fees'),
  setFee: (countryId, fee) => api.put(`/countries/fees/${countryId}`, { fee }),
};

export const applications = {
  list: (params) => api.get('/applications', { params }),
  apply: (classId, countryCode) =>
    api.post('/applications', { classId, countryCode }),
  approve: (id) => api.put(`/applications/${id}/approve`),
  reject: (id, notes) => api.put(`/applications/${id}/reject`, { notes }),
  awardScholarship: (id, action, type, discountPct) =>
    api.put(`/applications/${id}/scholarship`, { action, type, discountPct }),
  requestScholarship: (id, reason) =>
    api.put(`/applications/${id}/request-scholarship`, { reason }),
  payClassFee: (id) => api.post(`/applications/${id}/pay-class-fee`),
  retryAppFee: (id) => api.post(`/applications/${id}/retry-app-fee`),
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
  studentCountries: () => api.get('/public/student-countries'),
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

export const lms = {
  // Curriculum
  curriculum: (classId) => api.get(`/lms/curriculum/${classId}`),
  createModule: (data) => api.post('/lms/modules', data),
  updateModule: (id, data) => api.put(`/lms/modules/${id}`, data),
  deleteModule: (id) => api.delete(`/lms/modules/${id}`),
  createLesson: (data) => {
    if (data instanceof FormData) {
      return api.post('/lms/lessons', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    return api.post('/lms/lessons', data);
  },
  updateLesson: (id, data) => {
    if (data instanceof FormData) {
      return api.put(`/lms/lessons/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    return api.put(`/lms/lessons/${id}`, data);
  },
  deleteLesson: (id) => api.delete(`/lms/lessons/${id}`),
  downloadLessonFile: (id) => api.get(`/lms/lessons/${id}/file`, { responseType: 'blob' }),
  // Progress
  markProgress: (lessonId, completed) => api.post('/lms/progress', { lessonId, completed }),
  myProgress: (classId) => api.get(`/lms/progress/${classId}`),
  // Quizzes
  quizForLesson: (lessonId) => api.get(`/lms/quizzes/lesson/${lessonId}`),
  createQuiz: (data) => api.post('/lms/quizzes', data),
  updateQuiz: (id, data) => api.put(`/lms/quizzes/${id}`, data),
  deleteQuiz: (id) => api.delete(`/lms/quizzes/${id}`),
  submitQuiz: (id, answers) => api.post(`/lms/quizzes/${id}/attempt`, { answers }),
  // Assignments
  assignments: (classId) => api.get(`/lms/assignments/${classId}`),
  createAssignment: (data) => api.post('/lms/assignments', data),
  updateAssignment: (id, data) => api.put(`/lms/assignments/${id}`, data),
  deleteAssignment: (id) => api.delete(`/lms/assignments/${id}`),
  submitAssignment: (id, data) => api.post(`/lms/assignments/${id}/submit`, data),
  assignmentSubmissions: (id) => api.get(`/lms/assignments/${id}/submissions`),
  gradeSubmission: (id, data) => api.put(`/lms/submissions/${id}/grade`, data),
  // Announcements
  announcements: (classId) => api.get(`/lms/announcements/${classId}`),
  createAnnouncement: (data) => api.post('/lms/announcements', data),
  deleteAnnouncement: (id) => api.delete(`/lms/announcements/${id}`),
};

export default api;
