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
  setFirstPassword: (newPassword) => api.post('/auth/set-first-password', { newPassword }),
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
  myAppFee: (countryCode) => api.get('/applications/my-app-fee', { params: { countryCode } }),
  apply: (classId, countryCode, scholarshipRequested, scholarshipType, scholarshipReason, scheduleCode) =>
    api.post('/applications', { classId, countryCode, scholarshipRequested, scholarshipType, scholarshipReason, scheduleCode }),
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

export const gallery = {
  // Public upload (no auth)
  upload: (formData) => api.post('/gallery/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  // Admin moderation (auth required)
  list:   (params) => api.get('/gallery', { params }),
  review: (id, action, admin_notes) => api.put(`/gallery/${id}/review`, { action, admin_notes }),
  remove: (id) => api.delete(`/gallery/${id}`),
  fileUrl: (id) => `/api/gallery/${id}/file`,          // admin preview
};

export const publicApi = {
  classes: (countryCode) => api.get('/public/classes', { params: { countryCode } }),
  applicationFee: (countryCode) => api.get('/public/application-fee', { params: { countryCode } }),
  team: () => api.get('/public/team'),
  cities: () => api.get('/public/cities'),
  countries: () => api.get('/public/countries'),
  books: () => api.get('/public/books'),
  studentCountries: () => api.get('/public/student-countries'),
  siteContent: (section) => api.get(`/public/content/${section}`),
  galleryItems: () => api.get('/public/gallery'),
  galleryFileUrl: (id) => `/api/public/gallery/${id}/file`,
  jobs: () => api.get('/public/jobs'),
};

export const teacherProfile = {
  // For teachers editing own profile, or admin/superadmin editing any teacher
  get:         (id)       => api.get(`/content/teacher/${id}`),
  update:      (id, data) => api.put(`/content/teacher/${id}`, data),
  uploadPhoto: (id, file) => {
    const fd = new FormData();
    fd.append('photo', file);
    return api.post(`/content/teacher/${id}/photo`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  // List all teachers (admin/superadmin)
  list: () => api.get('/content/teachers'),
};

export const content = {
  // Site content CMS (superadmin)
  getSiteContent: (section) => api.get(`/content/site/${section}`),
  updateSiteContent: (section, contentData) => api.put(`/content/site/${section}`, { content: contentData }),
  // Team (superadmin)
  getTeam: () => api.get('/content/team'),
  createTeamMember: (data) => api.post('/content/team', data),
  updateTeamMember: (id, data) => api.put(`/content/team/${id}`, data),
  deleteTeamMember: (id) => api.delete(`/content/team/${id}`),
  uploadTeamPhoto: (id, file) => {
    const fd = new FormData();
    fd.append('photo', file);
    return api.post(`/content/team/${id}/photo`, fd);
  },
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

export const family = {
  children:          ()      => api.get('/family/children'),
  parent:            ()      => api.get('/family/parent'),
  childClasses:      (id)    => api.get(`/family/children/${id}/classes`),
  childSchedule:     (id)    => api.get(`/family/children/${id}/schedule`),
  childApplications: (id)    => api.get(`/family/children/${id}/applications`),
  addChild:          (data)  => api.post('/family/add-child', data),
  addParent:         (data)  => api.post('/family/add-parent', data),
};

export const mathwave = {
  status: () => api.get('/mathwave/status'),
  sync: (classId) => api.post(`/mathwave/sync/${classId}`),
  results: (studentId, classId) => api.get(`/mathwave/results/${studentId}`, { params: { classId } }),
};

export const recordings = {
  list: () => api.get('/recordings'),
  byClass: (classId) => api.get(`/recordings/class/${classId}`),
};

export const discount = {
  get:    ()           => api.get('/discount'),
  extend: (new_ends_at) => api.put('/discount/extend', { new_ends_at }),
};

export const blogs = {
  // Public
  list:     ()        => api.get('/blogs'),
  bySlug:   (slug)    => api.get(`/blogs/${slug}`),
  // Superadmin
  listAll:  ()        => api.get('/blogs/admin/all'),
  create:   (data)    => api.post('/blogs', data),
  update:   (id,data) => api.put(`/blogs/${id}`, data),
  remove:   (id)      => api.delete(`/blogs/${id}`),
  uploadHero: (id, file) => {
    const fd = new FormData();
    fd.append('image', file);
    return api.post(`/blogs/${id}/image`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const jobs = {
  list:   ()         => api.get('/jobs'),
  create: (data)     => api.post('/jobs', data),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  remove: (id)       => api.delete(`/jobs/${id}`),
};

export default api;
