/**
 * Mathwave Integration Service (Placeholder)
 * Full implementation pending Mathwave API documentation.
 */
const axios = require('axios');

const client = () =>
  axios.create({
    baseURL: process.env.MATHWAVE_API_URL,
    headers: { 'X-API-Key': process.env.MATHWAVE_API_KEY },
    timeout: 10000,
  });

async function syncClass(classId, className) {
  if (!process.env.MATHWAVE_API_URL) {
    return { status: 'not_configured', message: 'Mathwave integration not yet configured' };
  }
  try {
    const res = await client().post('/classes/sync', { externalId: classId, name: className });
    return res.data;
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

async function getStudentResults(studentId, classId) {
  if (!process.env.MATHWAVE_API_URL) {
    return { status: 'not_configured', results: [] };
  }
  try {
    const res = await client().get(`/results`, { params: { studentId, classId } });
    return res.data;
  } catch (err) {
    return { status: 'error', results: [] };
  }
}

module.exports = { syncClass, getStudentResults };
