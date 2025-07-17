const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'stats.db');

let db;

async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Veritabanına bağlanırken hata oluştu:', err.message);
        reject(err);
        return;
      }
      console.log('SQLite veritabanına bağlandı');

      db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS user_stats (
          user_id TEXT PRIMARY KEY,
          message_count INTEGER DEFAULT 0,
          voice_minutes INTEGER DEFAULT 0,
          partner_count INTEGER DEFAULT 0,
          last_updated TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS daily_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT,
          date TEXT,
          message_count INTEGER DEFAULT 0,
          voice_minutes INTEGER DEFAULT 0,
          partner_count INTEGER DEFAULT 0,
          UNIQUE(user_id, date)
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_type TEXT,
          target_amount INTEGER,
          description TEXT,
          created_at TEXT,
          expires_at TEXT,
          assigned_user_id TEXT
        )`, (err) => {
          if (err) {
            console.error('Tablolar oluşturulurken hata oluştu:', err.message);
            reject(err);
          } else {
            console.log('Veritabanı tabloları başarıyla oluşturuldu');
            resolve();
          }
        });
        
        db.run(`CREATE TABLE IF NOT EXISTS user_tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT,
          task_id INTEGER,
          progress INTEGER DEFAULT 0,
          completed INTEGER DEFAULT 0,
          FOREIGN KEY(task_id) REFERENCES tasks(id)
        )`, (err) => {
          if (err) {
            console.error('Tablolar oluşturulurken hata oluştu:', err.message);
            reject(err);
          } else {
            console.log('Veritabanı tabloları başarıyla oluşturuldu');
            resolve();
          }
        });
        
        db.run(`PRAGMA foreign_keys = OFF`);
        db.run(`
          ALTER TABLE tasks ADD COLUMN authorized_roles TEXT
        `, (err) => {
          if (err && !err.message.includes('duplicate column')) {
            console.error('tasks tablosuna authorized_roles sütunu eklenirken hata oluştu:', err.message);
          }
        });
        db.run(`PRAGMA foreign_keys = ON`);
      });
    });
  });
}

async function updateUserStats(userId, messageCount = 0, voiceMinutes = 0, partnerCount = 0) {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    db.run(
      `INSERT INTO user_stats (user_id, message_count, voice_minutes, partner_count, last_updated)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
       message_count = message_count + ?,
       voice_minutes = voice_minutes + ?,
       partner_count = partner_count + ?,
       last_updated = ?`,
      [userId, messageCount, voiceMinutes, partnerCount, now, messageCount, voiceMinutes, partnerCount, now],
      function(err) {
        if (err) {
          console.error('Kullanıcı istatistikleri güncellenirken hata oluştu:', err.message);
          reject(err);
          return;
        }

        db.run(
          `INSERT INTO daily_stats (user_id, date, message_count, voice_minutes, partner_count)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(user_id, date) DO UPDATE SET
           message_count = message_count + ?,
           voice_minutes = voice_minutes + ?,
           partner_count = partner_count + ?`,
          [userId, today, messageCount, voiceMinutes, partnerCount, messageCount, voiceMinutes, partnerCount],
          function(err) {
            if (err) {
              console.error('Günlük istatistikler güncellenirken hata oluştu:', err.message);
              reject(err);
            } else {
              resolve();
            }
          }
        );
      }
    );
  });
}

async function getUserStats(userId, period = 'all') {
  return new Promise((resolve, reject) => {
    let query;
    let params;

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (period === 'all') {
      
      query = `SELECT * FROM user_stats WHERE user_id = ?`;
      params = [userId];
    } else {
      
      let startDate;

      if (period === 'day') {
        startDate = today;
      } else if (period === 'week') {
        const lastWeek = new Date(now);
        lastWeek.setDate(now.getDate() - 7);
        startDate = lastWeek.toISOString().split('T')[0];
      } else if (period === 'month') {
        const lastMonth = new Date(now);
        lastMonth.setDate(now.getDate() - 30);
        startDate = lastMonth.toISOString().split('T')[0];
      }

      query = `
        SELECT user_id, 
               SUM(message_count) as message_count, 
               SUM(voice_minutes) as voice_minutes, 
               SUM(partner_count) as partner_count
        FROM daily_stats 
        WHERE user_id = ? AND date >= ?
        GROUP BY user_id`;
      params = [userId, startDate];
    }

    db.get(query, params, (err, row) => {
      if (err) {
        console.error('Kullanıcı istatistikleri alınırken hata oluştu:', err.message);
        reject(err);
      } else {
        resolve(row || { user_id: userId, message_count: 0, voice_minutes: 0, partner_count: 0 });
      }
    });
  });
}

async function getUserStatsHistory(userId, days = 30) {
  return new Promise((resolve, reject) => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const query = `
      SELECT date, message_count, voice_minutes, partner_count
      FROM daily_stats
      WHERE user_id = ? AND date >= ?
      ORDER BY date ASC`;

    db.all(query, [userId, startDateStr], (err, rows) => {
      if (err) {
        console.error('Kullanıcı istatistik geçmişi alınırken hata oluştu:', err.message);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

async function createTask(taskType, targetAmount, description, expiresInDays = 7, assignedUserId = null, authorizedRoles = null) {
  return new Promise((resolve, reject) => {
    const now = new Date();
    const createdAt = now.toISOString();
    
    const expiresAt = new Date(now);
    expiresAt.setDate(now.getDate() + expiresInDays);
    const expiresAtStr = expiresAt.toISOString();

    const authorizedRolesJson = authorizedRoles ? JSON.stringify(authorizedRoles) : null;

    const query = `
      INSERT INTO tasks (task_type, target_amount, description, created_at, expires_at, assigned_user_id, authorized_roles)
      VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.run(query, [taskType, targetAmount, description, createdAt, expiresAtStr, assignedUserId, authorizedRolesJson], function(err) {
      if (err) {
        console.error('Görev oluşturulurken hata oluştu:', err.message);
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
}

async function listTasks() {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    
    const query = `
      SELECT * FROM tasks
      WHERE expires_at > ?
      ORDER BY created_at DESC`;

    db.all(query, [now], (err, rows) => {
      if (err) {
        console.error('Görevler listelenirken hata oluştu:', err.message);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

async function deleteTask(taskId) {
  return new Promise((resolve, reject) => {

    db.run('DELETE FROM user_tasks WHERE task_id = ?', [taskId], function(err) {
      if (err) {
        console.error('Kullanıcı görevleri silinirken hata oluştu:', err.message);
        reject(err);
        return;
      }
      
      db.run('DELETE FROM tasks WHERE id = ?', [taskId], function(err) {
        if (err) {
          console.error('Görev silinirken hata oluştu:', err.message);
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  });
}

async function updateUserTaskProgress(userId, taskType, amount) {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    

    const query = `
      SELECT t.id, t.target_amount, ut.progress, ut.id as user_task_id
      FROM tasks t
      LEFT JOIN user_tasks ut ON t.id = ut.task_id AND ut.user_id = ?
      WHERE t.task_type = ? AND t.expires_at > ? AND (ut.completed IS NULL OR ut.completed = 0)
      AND (t.assigned_user_id IS NULL OR t.assigned_user_id = ?)`;

    db.all(query, [userId, taskType, now, userId], (err, tasks) => {
      if (err) {
        console.error('Görevler alınırken hata oluştu:', err.message);
        reject(err);
        return;
      }

      if (tasks.length === 0) {
        resolve(0);
        return;
      }


      const promises = tasks.map(task => {
        return new Promise((resolveTask, rejectTask) => {
          if (task.user_task_id) {
            const newProgress = task.progress + amount;
            const completed = newProgress >= task.target_amount ? 1 : 0;
            
            db.run(
              'UPDATE user_tasks SET progress = ?, completed = ? WHERE id = ?',
              [newProgress, completed, task.user_task_id],
              function(err) {
                if (err) {
                  console.error('Kullanıcı görevi güncellenirken hata oluştu:', err.message);
                  rejectTask(err);
                } else {
                  resolveTask({ taskId: task.id, completed });
                }
              }
            );
          } else {
            const progress = amount;
            const completed = progress >= task.target_amount ? 1 : 0;
            
            db.run(
              'INSERT INTO user_tasks (user_id, task_id, progress, completed) VALUES (?, ?, ?, ?)',
              [userId, task.id, progress, completed],
              function(err) {
                if (err) {
                  console.error('Kullanıcı görevi oluşturulurken hata oluştu:', err.message);
                  rejectTask(err);
                } else {
                  resolveTask({ taskId: task.id, completed });
                }
              }
            );
          }
        });
      });

      Promise.all(promises)
        .then(results => resolve(results))
        .catch(err => reject(err));
    });
  });
}


async function getUserTasks(userId, userRoles = []) {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    
    const query = `
      SELECT t.*, ut.progress, ut.completed
      FROM tasks t
      LEFT JOIN user_tasks ut ON t.id = ut.task_id AND ut.user_id = ?
      WHERE (t.expires_at > ? AND (t.assigned_user_id IS NULL OR t.assigned_user_id = ?))
      ORDER BY t.created_at DESC`;

    db.all(query, [userId, now, userId], (err, rows) => {
      if (err) {
        console.error('Kullanıcı görevleri alınırken hata oluştu:', err.message);
        reject(err);
      } else {
        const filteredRows = rows.filter(row => {
          if (row.assigned_user_id === userId) return true;
          
          if (row.authorized_roles) {
            try {
              const authorizedRoles = JSON.parse(row.authorized_roles);
              return userRoles.some(role => authorizedRoles.includes(role));
            } catch (e) {
              console.error('Yetkili roller JSON parse hatası:', e);
              return false;
            }
          }
          
          return row.authorized_roles === null;
        });
        
        resolve(filteredRows || []);
      }
    });
  });
}

async function checkExpiredTasks() {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    

    const query = `
      SELECT t.*, ut.user_id, ut.progress, ut.completed
      FROM tasks t
      LEFT JOIN user_tasks ut ON t.id = ut.task_id
      WHERE t.expires_at <= ?`;

    db.all(query, [now], async (err, rows) => {
      if (err) {
        console.error('Süresi dolan görevler kontrol edilirken hata oluştu:', err.message);
        reject(err);
        return;
      }
      
      const expiredTasks = {};
      
      for (const row of rows) {
        if (!expiredTasks[row.id]) {
          expiredTasks[row.id] = {
            id: row.id,
            task_type: row.task_type,
            target_amount: row.target_amount,
            description: row.description,
            created_at: row.created_at,
            expires_at: row.expires_at,
            users: []
          };
        }
        
        if (row.user_id) {
          expiredTasks[row.id].users.push({
            user_id: row.user_id,
            progress: row.progress || 0,
            completed: row.completed || 0
          });
        }
      }
      
      resolve(Object.values(expiredTasks));
    });
  });
}

async function deleteExpiredTasks() {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    
    db.run('DELETE FROM tasks WHERE expires_at <= ?', [now], function(err) {
      if (err) {
        console.error('Süresi dolan görevler silinirken hata oluştu:', err.message);
        reject(err);
        return;
      }
      
      db.run('DELETE FROM user_tasks WHERE task_id NOT IN (SELECT id FROM tasks)', function(err) {
        if (err) {
          console.error('Kullanıcı görevleri silinirken hata oluştu:', err.message);
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  });
}

async function getTopUsers(statType = 'message', limit = 10, period = 'all') {
  return new Promise((resolve, reject) => {
    let query;
    let params = [];
    
    let statColumn;
    switch (statType) {
      case 'message':
        statColumn = 'message_count';
        break;
      case 'voice':
        statColumn = 'voice_minutes';
        break;
      case 'partner':
        statColumn = 'partner_count';
        break;
      default:
        statColumn = 'message_count';
    }
    
    const now = new Date();
    
    if (period === 'all') {
      query = `
        SELECT user_id, ${statColumn} as stat_value
        FROM user_stats
        WHERE ${statColumn} > 0
        ORDER BY ${statColumn} DESC
        LIMIT ?`;
      params = [limit];
    } else {
      let startDate;
      
      if (period === 'day') {
        startDate = now.toISOString().split('T')[0];
      } else if (period === 'week') {
        const lastWeek = new Date(now);
        lastWeek.setDate(now.getDate() - 7);
        startDate = lastWeek.toISOString().split('T')[0];
      } else if (period === 'month') {
        const lastMonth = new Date(now);
        lastMonth.setDate(now.getDate() - 30);
        startDate = lastMonth.toISOString().split('T')[0];
      }
      
      query = `
        SELECT user_id, SUM(${statColumn}) as stat_value
        FROM daily_stats
        WHERE date >= ? AND ${statColumn} > 0
        GROUP BY user_id
        ORDER BY stat_value DESC
        LIMIT ?`;
      params = [startDate, limit];
    }
    
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error(`En iyi ${statType} istatistikleri alınırken hata oluştu:`, err.message);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

module.exports = {
  initializeDatabase,
  updateUserStats,
  getUserStats,
  getUserStatsHistory,
  getTopUsers,
  createTask,
  listTasks,
  deleteTask,
  updateUserTaskProgress,
  getUserTasks,
  checkExpiredTasks,
  deleteExpiredTasks
};