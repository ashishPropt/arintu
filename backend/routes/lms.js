const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

// ── Lesson file storage ────────────────────────────────────────────────────────
const LESSON_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'lessons');
if (!fs.existsSync(LESSON_UPLOAD_DIR)) fs.mkdirSync(LESSON_UPLOAD_DIR, { recursive: true });

const lessonStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, LESSON_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-z0-9]/gi, '_')
      .slice(0, 50);
    cb(null, `lesson_${Date.now()}_${base}${ext}`);
  },
});

const lessonUpload = multer({
  storage: lessonStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm',
      'audio/mpeg', 'audio/wav',
      'application/zip',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('File type not allowed'));
  },
});

function withLessonUpload(req, res, next) {
  lessonUpload.single('lesson_file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File must be under 50 MB' : err.message });
    }
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}

// ---------------------------------------------------------------------------
// Helper: check if a user can manage a given class
// ---------------------------------------------------------------------------
async function canManageClass(userId, role, classId) {
  if (role === 'superadmin') return true;
  if (role === 'admin') {
    const res = await db.query(
      'SELECT id FROM classes WHERE id = $1 AND admin_id = $2',
      [classId, userId]
    );
    return res.rows.length > 0;
  }
  if (role === 'teacher') {
    const res = await db.query(
      'SELECT id FROM teacher_assignments WHERE teacher_id = $1 AND class_id = $2',
      [userId, classId]
    );
    return res.rows.length > 0;
  }
  return false;
}

// ---------------------------------------------------------------------------
// CURRICULUM
// ---------------------------------------------------------------------------

// GET /lms/curriculum/:classId
router.get('/curriculum/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;
    const { id: userId, role } = req.user;
    const isManager = await canManageClass(userId, role, classId);
    const isStudent = role === 'student';

    const publishedFilter = isManager ? '' : 'AND m.is_published = TRUE';
    const lessonPublishedFilter = isManager ? '' : 'AND l.is_published = TRUE';

    // Fetch modules
    const modulesRes = await db.query(
      `SELECT m.*
       FROM course_modules m
       WHERE m.class_id = $1 ${publishedFilter}
       ORDER BY m.position ASC, m.created_at ASC`,
      [classId]
    );

    // Fetch lessons with quiz existence flag
    const lessonsRes = await db.query(
      `SELECT l.*,
              CASE WHEN q.id IS NOT NULL THEN TRUE ELSE FALSE END AS has_quiz
       FROM lessons l
       LEFT JOIN quizzes q ON q.lesson_id = l.id
       WHERE l.class_id = $1 ${lessonPublishedFilter}
       ORDER BY l.position ASC, l.created_at ASC`,
      [classId]
    );

    // Map lessons into modules
    const lessonsByModule = {};
    for (const lesson of lessonsRes.rows) {
      if (!lessonsByModule[lesson.module_id]) lessonsByModule[lesson.module_id] = [];
      lessonsByModule[lesson.module_id].push(lesson);
    }

    const modules = modulesRes.rows.map((m) => ({
      ...m,
      lessons: lessonsByModule[m.id] || [],
    }));

    // Fetch announcements
    const announcementsRes = await db.query(
      `SELECT a.*, u.name AS created_by_name
       FROM announcements a
       JOIN users u ON u.id = a.created_by
       WHERE a.class_id = $1
       ORDER BY a.is_pinned DESC, a.created_at DESC`,
      [classId]
    );

    // Fetch assignments
    let assignmentsRes;
    if (isStudent) {
      assignmentsRes = await db.query(
        `SELECT a.*,
                s.id AS submission_id, s.status AS submission_status,
                s.score AS submission_score, s.submitted_at
         FROM assignments a
         LEFT JOIN assignment_submissions s
           ON s.assignment_id = a.id AND s.student_id = $2
         WHERE a.class_id = $1 AND a.is_published = TRUE
         ORDER BY a.due_date ASC NULLS LAST, a.created_at DESC`,
        [classId, userId]
      );
    } else {
      assignmentsRes = await db.query(
        `SELECT a.*
         FROM assignments a
         WHERE a.class_id = $1
         ORDER BY a.due_date ASC NULLS LAST, a.created_at DESC`,
        [classId]
      );
    }

    return res.json({
      modules,
      announcements: announcementsRes.rows,
      assignments: assignmentsRes.rows,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /lms/modules
router.post('/modules', authenticate, async (req, res) => {
  try {
    const { classId, title, description } = req.body;
    const { id: userId, role } = req.user;

    if (!(await canManageClass(userId, role, classId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await db.query(
      `INSERT INTO course_modules (class_id, title, description)
       VALUES ($1, $2, $3) RETURNING *`,
      [classId, title, description || null]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /lms/modules/:id
router.put('/modules/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, position, is_published } = req.body;
    const { id: userId, role } = req.user;

    const moduleRes = await db.query('SELECT * FROM course_modules WHERE id = $1', [id]);
    if (moduleRes.rows.length === 0) return res.status(404).json({ error: 'Module not found' });

    const mod = moduleRes.rows[0];
    if (!(await canManageClass(userId, role, mod.class_id))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await db.query(
      `UPDATE course_modules
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           position = COALESCE($3, position),
           is_published = COALESCE($4, is_published),
           updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [title ?? null, description ?? null, position ?? null, is_published ?? null, id]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /lms/modules/:id
router.delete('/modules/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    const moduleRes = await db.query('SELECT * FROM course_modules WHERE id = $1', [id]);
    if (moduleRes.rows.length === 0) return res.status(404).json({ error: 'Module not found' });

    const mod = moduleRes.rows[0];
    if (!(await canManageClass(userId, role, mod.class_id))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await db.query('DELETE FROM course_modules WHERE id = $1', [id]);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /lms/lessons  (multipart/form-data when uploading a file)
router.post('/lessons', authenticate, withLessonUpload, async (req, res) => {
  try {
    const { moduleId, classId, title, content_type, content_text, video_url, file_url, file_name, duration_mins } = req.body;
    const { id: userId, role } = req.user;

    if (!(await canManageClass(userId, role, classId))) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Forbidden' });
    }

    // File upload takes priority over file_url for 'file' type lessons
    const uploadedPath = req.file?.path || null;
    const uploadedName = req.file?.originalname || null;
    const uploadedSize = req.file?.size || null;

    const result = await db.query(
      `INSERT INTO lessons
         (module_id, class_id, title, content_type, content_text, video_url,
          file_url, file_name, file_path, file_size, duration_mins)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        moduleId, classId, title,
        content_type || 'text',
        content_text || null,
        video_url || null,
        uploadedPath ? null : (file_url || null),
        uploadedName || file_name || null,
        uploadedPath,
        uploadedSize,
        duration_mins || null,
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /lms/lessons/:id  (multipart/form-data when replacing a file)
router.put('/lessons/:id', authenticate, withLessonUpload, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content_type, content_text, video_url, file_url, file_name, duration_mins, position, is_published } = req.body;
    const { id: userId, role } = req.user;

    const lessonRes = await db.query('SELECT * FROM lessons WHERE id = $1', [id]);
    if (lessonRes.rows.length === 0) return res.status(404).json({ error: 'Lesson not found' });

    const lesson = lessonRes.rows[0];
    if (!(await canManageClass(userId, role, lesson.class_id))) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Forbidden' });
    }

    // If a new file was uploaded, delete the old one
    let newFilePath = lesson.file_path;
    let newFileName = lesson.file_name;
    let newFileSize = lesson.file_size;
    let newFileUrl  = lesson.file_url;

    if (req.file) {
      if (lesson.file_path && fs.existsSync(lesson.file_path)) {
        try { fs.unlinkSync(lesson.file_path); } catch {}
      }
      newFilePath = req.file.path;
      newFileName = req.file.originalname;
      newFileSize = req.file.size;
      newFileUrl  = null; // uploaded file takes over from any external URL
    } else if (file_url !== undefined) {
      // Explicit external URL provided — clear any uploaded file
      if (file_url && lesson.file_path && fs.existsSync(lesson.file_path)) {
        try { fs.unlinkSync(lesson.file_path); } catch {}
        newFilePath = null;
        newFileSize = null;
      }
      newFileUrl  = file_url || null;
      newFileName = file_name || lesson.file_name;
    }

    const result = await db.query(
      `UPDATE lessons
       SET title        = COALESCE($1, title),
           content_type = COALESCE($2, content_type),
           content_text = COALESCE($3, content_text),
           video_url    = COALESCE($4, video_url),
           file_url     = $5,
           file_name    = $6,
           file_path    = $7,
           file_size    = $8,
           duration_mins = COALESCE($9, duration_mins),
           position     = COALESCE($10, position),
           is_published = COALESCE($11, is_published),
           updated_at   = NOW()
       WHERE id = $12 RETURNING *`,
      [
        title       ?? null,
        content_type ?? null,
        content_text ?? null,
        video_url   ?? null,
        newFileUrl,
        newFileName,
        newFilePath,
        newFileSize,
        duration_mins ?? null,
        position    ?? null,
        is_published !== undefined ? (is_published === 'true' || is_published === true) : null,
        id,
      ]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /lms/lessons/:id/file  — authenticated download
router.get('/lessons/:id/file', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    const lessonRes = await db.query('SELECT * FROM lessons WHERE id = $1', [id]);
    if (lessonRes.rows.length === 0) return res.status(404).json({ error: 'Lesson not found' });

    const lesson = lessonRes.rows[0];

    // Students need to be enrolled; managers always allowed
    const isManager = await canManageClass(userId, role, lesson.class_id);
    if (!isManager) {
      const enrolled = await db.query(
        'SELECT id FROM enrollments WHERE class_id = $1 AND student_id = $2',
        [lesson.class_id, userId]
      );
      if (enrolled.rows.length === 0) return res.status(403).json({ error: 'Access denied' });
      if (!lesson.is_published) return res.status(403).json({ error: 'Lesson not available' });
    }

    if (!lesson.file_path || !fs.existsSync(lesson.file_path)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    res.download(path.resolve(lesson.file_path), lesson.file_name || 'lesson-file');
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /lms/lessons/:id
router.delete('/lessons/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    const lessonRes = await db.query('SELECT * FROM lessons WHERE id = $1', [id]);
    if (lessonRes.rows.length === 0) return res.status(404).json({ error: 'Lesson not found' });

    const lesson = lessonRes.rows[0];
    if (!(await canManageClass(userId, role, lesson.class_id))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Delete uploaded file if any
    if (lesson.file_path && fs.existsSync(lesson.file_path)) {
      try { fs.unlinkSync(lesson.file_path); } catch {}
    }

    await db.query('DELETE FROM lessons WHERE id = $1', [id]);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// PROGRESS
// ---------------------------------------------------------------------------

// POST /lms/progress
router.post('/progress', authenticate, async (req, res) => {
  try {
    const { lessonId, completed } = req.body;
    const { id: userId, role } = req.user;

    if (role !== 'student') return res.status(403).json({ error: 'Students only' });

    if (completed) {
      await db.query(
        `INSERT INTO lesson_progress (student_id, lesson_id, completed, completed_at)
         VALUES ($1, $2, TRUE, NOW())
         ON CONFLICT (student_id, lesson_id)
         DO UPDATE SET completed = TRUE, completed_at = NOW()`,
        [userId, lessonId]
      );
    } else {
      await db.query(
        `INSERT INTO lesson_progress (student_id, lesson_id, completed)
         VALUES ($1, $2, FALSE)
         ON CONFLICT (student_id, lesson_id)
         DO UPDATE SET completed = FALSE`,
        [userId, lessonId]
      );
    }
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /lms/progress/:classId
router.get('/progress/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;
    const { id: userId, role } = req.user;

    if (role !== 'student') return res.status(403).json({ error: 'Students only' });

    const totalRes = await db.query(
      `SELECT COUNT(*) AS total FROM lessons WHERE class_id = $1 AND is_published = TRUE`,
      [classId]
    );
    const total = parseInt(totalRes.rows[0].total, 10);

    const progressRes = await db.query(
      `SELECT lp.lesson_id
       FROM lesson_progress lp
       JOIN lessons l ON l.id = lp.lesson_id
       WHERE lp.student_id = $1 AND l.class_id = $2 AND lp.completed = TRUE`,
      [userId, classId]
    );

    const completed = progressRes.rows.map((r) => r.lesson_id);
    const completed_count = completed.length;
    const pct = total > 0 ? Math.round((completed_count / total) * 100) : 0;

    return res.json({ completed, total_lessons: total, completed_count, pct });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// QUIZZES
// ---------------------------------------------------------------------------

// GET /lms/quizzes/lesson/:lessonId
router.get('/quizzes/lesson/:lessonId', authenticate, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { id: userId, role } = req.user;

    const lessonRes = await db.query('SELECT * FROM lessons WHERE id = $1', [lessonId]);
    if (lessonRes.rows.length === 0) return res.status(404).json({ error: 'Lesson not found' });
    const lesson = lessonRes.rows[0];

    const isManager = await canManageClass(userId, role, lesson.class_id);

    const quizRes = await db.query('SELECT * FROM quizzes WHERE lesson_id = $1', [lessonId]);
    if (quizRes.rows.length === 0) return res.json(null);

    const quiz = quizRes.rows[0];

    const questionsRes = await db.query(
      'SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY position ASC',
      [quiz.id]
    );

    const questions = await Promise.all(
      questionsRes.rows.map(async (q) => {
        const optionsRes = await db.query(
          isManager
            ? 'SELECT * FROM quiz_options WHERE question_id = $1 ORDER BY position ASC'
            : 'SELECT id, question_id, option_text, position FROM quiz_options WHERE question_id = $1 ORDER BY position ASC',
          [q.id]
        );
        return { ...q, options: optionsRes.rows };
      })
    );

    return res.json({ ...quiz, questions });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /lms/quizzes
router.post('/quizzes', authenticate, async (req, res) => {
  try {
    const { classId, lessonId, title, description, passScore, questions } = req.body;
    const { id: userId, role } = req.user;

    if (!(await canManageClass(userId, role, classId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const quizRes = await client.query(
        `INSERT INTO quizzes (class_id, lesson_id, title, description, pass_score)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [classId, lessonId || null, title, description || null, passScore || 70]
      );
      const quiz = quizRes.rows[0];

      if (Array.isArray(questions)) {
        for (let qi = 0; qi < questions.length; qi++) {
          const q = questions[qi];
          const qRes = await client.query(
            `INSERT INTO quiz_questions (quiz_id, question, points, position)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [quiz.id, q.question, q.points || 1, qi]
          );
          const question = qRes.rows[0];

          if (Array.isArray(q.options)) {
            for (let oi = 0; oi < q.options.length; oi++) {
              const opt = q.options[oi];
              await client.query(
                `INSERT INTO quiz_options (question_id, option_text, is_correct, position)
                 VALUES ($1, $2, $3, $4)`,
                [question.id, opt.option_text, opt.is_correct || false, oi]
              );
            }
          }
        }
      }

      await client.query('COMMIT');
      return res.status(201).json(quiz);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /lms/quizzes/:id
router.put('/quizzes/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, passScore, questions } = req.body;
    const { id: userId, role } = req.user;

    const quizRes = await db.query('SELECT * FROM quizzes WHERE id = $1', [id]);
    if (quizRes.rows.length === 0) return res.status(404).json({ error: 'Quiz not found' });
    const quiz = quizRes.rows[0];

    if (!(await canManageClass(userId, role, quiz.class_id))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const updated = await client.query(
        `UPDATE quizzes
         SET title = COALESCE($1, title),
             description = COALESCE($2, description),
             pass_score = COALESCE($3, pass_score)
         WHERE id = $4 RETURNING *`,
        [title ?? null, description ?? null, passScore ?? null, id]
      );

      if (Array.isArray(questions)) {
        // Replace all questions and options
        await client.query('DELETE FROM quiz_questions WHERE quiz_id = $1', [id]);

        for (let qi = 0; qi < questions.length; qi++) {
          const q = questions[qi];
          const qRes = await client.query(
            `INSERT INTO quiz_questions (quiz_id, question, points, position)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [id, q.question, q.points || 1, qi]
          );
          const question = qRes.rows[0];

          if (Array.isArray(q.options)) {
            for (let oi = 0; oi < q.options.length; oi++) {
              const opt = q.options[oi];
              await client.query(
                `INSERT INTO quiz_options (question_id, option_text, is_correct, position)
                 VALUES ($1, $2, $3, $4)`,
                [question.id, opt.option_text, opt.is_correct || false, oi]
              );
            }
          }
        }
      }

      await client.query('COMMIT');
      return res.json(updated.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /lms/quizzes/:id
router.delete('/quizzes/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    const quizRes = await db.query('SELECT * FROM quizzes WHERE id = $1', [id]);
    if (quizRes.rows.length === 0) return res.status(404).json({ error: 'Quiz not found' });
    const quiz = quizRes.rows[0];

    if (!(await canManageClass(userId, role, quiz.class_id))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await db.query('DELETE FROM quizzes WHERE id = $1', [id]);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /lms/quizzes/:id/attempt
router.post('/quizzes/:id/attempt', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body; // { questionId: optionId }
    const { id: userId, role } = req.user;

    if (role !== 'student') return res.status(403).json({ error: 'Students only' });

    const quizRes = await db.query('SELECT * FROM quizzes WHERE id = $1', [id]);
    if (quizRes.rows.length === 0) return res.status(404).json({ error: 'Quiz not found' });
    const quiz = quizRes.rows[0];

    // Load questions and options
    const questionsRes = await db.query(
      'SELECT * FROM quiz_questions WHERE quiz_id = $1',
      [id]
    );

    let totalPoints = 0;
    let earnedPoints = 0;
    const total = questionsRes.rows.length;
    let correct = 0;

    for (const question of questionsRes.rows) {
      totalPoints += question.points;
      const chosenOptionId = answers ? answers[question.id] : null;
      if (chosenOptionId) {
        const optRes = await db.query(
          'SELECT is_correct FROM quiz_options WHERE id = $1 AND question_id = $2',
          [chosenOptionId, question.id]
        );
        if (optRes.rows.length > 0 && optRes.rows[0].is_correct) {
          earnedPoints += question.points;
          correct++;
        }
      }
    }

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passed = score >= quiz.pass_score;

    await db.query(
      `INSERT INTO quiz_attempts (quiz_id, student_id, answers, score, passed, completed_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [id, userId, JSON.stringify(answers || {}), score, passed]
    );

    return res.json({ score, passed, correct, total });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// ASSIGNMENTS
// ---------------------------------------------------------------------------

// GET /lms/assignments/:classId
router.get('/assignments/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;
    const { id: userId, role } = req.user;
    const isManager = await canManageClass(userId, role, classId);

    let result;
    if (role === 'student') {
      result = await db.query(
        `SELECT a.*,
                s.id AS submission_id, s.status AS submission_status,
                s.score AS submission_score, s.submitted_at, s.feedback AS submission_feedback
         FROM assignments a
         LEFT JOIN assignment_submissions s
           ON s.assignment_id = a.id AND s.student_id = $2
         WHERE a.class_id = $1 AND a.is_published = TRUE
         ORDER BY a.due_date ASC NULLS LAST, a.created_at DESC`,
        [classId, userId]
      );
    } else if (isManager) {
      result = await db.query(
        `SELECT a.*
         FROM assignments a
         WHERE a.class_id = $1
         ORDER BY a.due_date ASC NULLS LAST, a.created_at DESC`,
        [classId]
      );
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /lms/assignments
router.post('/assignments', authenticate, async (req, res) => {
  try {
    const { classId, title, description, due_date, max_score, submission_type } = req.body;
    const { id: userId, role } = req.user;

    if (!(await canManageClass(userId, role, classId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await db.query(
      `INSERT INTO assignments (class_id, created_by, title, description, due_date, max_score, submission_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [classId, userId, title, description || null, due_date || null, max_score || 100, submission_type || 'any']
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /lms/assignments/:id
router.put('/assignments/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, due_date, max_score, submission_type, is_published } = req.body;
    const { id: userId, role } = req.user;

    const assignRes = await db.query('SELECT * FROM assignments WHERE id = $1', [id]);
    if (assignRes.rows.length === 0) return res.status(404).json({ error: 'Assignment not found' });
    const assignment = assignRes.rows[0];

    if (!(await canManageClass(userId, role, assignment.class_id))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await db.query(
      `UPDATE assignments
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           due_date = COALESCE($3, due_date),
           max_score = COALESCE($4, max_score),
           submission_type = COALESCE($5, submission_type),
           is_published = COALESCE($6, is_published),
           updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [title ?? null, description ?? null, due_date ?? null, max_score ?? null, submission_type ?? null, is_published ?? null, id]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /lms/assignments/:id
router.delete('/assignments/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    const assignRes = await db.query('SELECT * FROM assignments WHERE id = $1', [id]);
    if (assignRes.rows.length === 0) return res.status(404).json({ error: 'Assignment not found' });
    const assignment = assignRes.rows[0];

    if (!(await canManageClass(userId, role, assignment.class_id))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await db.query('DELETE FROM assignments WHERE id = $1', [id]);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /lms/assignments/:id/submit
router.post('/assignments/:id/submit', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { submission_text } = req.body;
    const { id: userId, role } = req.user;

    if (role !== 'student') return res.status(403).json({ error: 'Students only' });

    const assignRes = await db.query('SELECT * FROM assignments WHERE id = $1', [id]);
    if (assignRes.rows.length === 0) return res.status(404).json({ error: 'Assignment not found' });

    const result = await db.query(
      `INSERT INTO assignment_submissions (assignment_id, student_id, submission_text, status, submitted_at)
       VALUES ($1, $2, $3, 'submitted', NOW())
       ON CONFLICT (assignment_id, student_id)
       DO UPDATE SET submission_text = $3, status = 'submitted', submitted_at = NOW()
       RETURNING *`,
      [id, userId, submission_text || null]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /lms/assignments/:id/submissions
router.get('/assignments/:id/submissions', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    const assignRes = await db.query('SELECT * FROM assignments WHERE id = $1', [id]);
    if (assignRes.rows.length === 0) return res.status(404).json({ error: 'Assignment not found' });
    const assignment = assignRes.rows[0];

    if (!(await canManageClass(userId, role, assignment.class_id))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await db.query(
      `SELECT s.*, u.name AS student_name, u.email AS student_email
       FROM assignment_submissions s
       JOIN users u ON u.id = s.student_id
       WHERE s.assignment_id = $1
       ORDER BY s.submitted_at DESC`,
      [id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /lms/submissions/:id/grade
router.put('/submissions/:id/grade', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { score, feedback } = req.body;
    const { id: userId, role } = req.user;

    const subRes = await db.query(
      `SELECT s.*, a.class_id FROM assignment_submissions s
       JOIN assignments a ON a.id = s.assignment_id
       WHERE s.id = $1`,
      [id]
    );
    if (subRes.rows.length === 0) return res.status(404).json({ error: 'Submission not found' });
    const submission = subRes.rows[0];

    if (!(await canManageClass(userId, role, submission.class_id))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await db.query(
      `UPDATE assignment_submissions
       SET score = $1, feedback = $2, graded_by = $3, graded_at = NOW(), status = 'graded'
       WHERE id = $4 RETURNING *`,
      [score ?? null, feedback ?? null, userId, id]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// ANNOUNCEMENTS
// ---------------------------------------------------------------------------

// GET /lms/announcements/:classId
router.get('/announcements/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;
    const { id: userId, role } = req.user;

    // Students see all announcements for enrolled classes; managers see their own
    const isManager = await canManageClass(userId, role, classId);
    if (!isManager && role !== 'student') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await db.query(
      `SELECT a.*, u.name AS created_by_name
       FROM announcements a
       JOIN users u ON u.id = a.created_by
       WHERE a.class_id = $1
       ORDER BY a.is_pinned DESC, a.created_at DESC`,
      [classId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /lms/announcements
router.post('/announcements', authenticate, async (req, res) => {
  try {
    const { classId, title, content, is_pinned } = req.body;
    const { id: userId, role } = req.user;

    if (!(await canManageClass(userId, role, classId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await db.query(
      `INSERT INTO announcements (class_id, created_by, title, content, is_pinned)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [classId, userId, title, content, is_pinned || false]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /lms/announcements/:id
router.delete('/announcements/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    const annRes = await db.query('SELECT * FROM announcements WHERE id = $1', [id]);
    if (annRes.rows.length === 0) return res.status(404).json({ error: 'Announcement not found' });
    const announcement = annRes.rows[0];

    if (!(await canManageClass(userId, role, announcement.class_id))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await db.query('DELETE FROM announcements WHERE id = $1', [id]);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
