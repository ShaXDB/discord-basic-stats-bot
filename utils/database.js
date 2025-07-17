const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const Logger = require('./logger');

const dbPath = path.join(__dirname, '../database/applications.db');

let db;

async function initializeApplicationDatabase() {
  return new Promise((resolve, reject) => {
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        Logger.error('Application database connection error:', err);
        reject(err);
        return;
      }
      Logger.info('Connected to application SQLite database');

      db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS applications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          user_tag TEXT NOT NULL,
          user_username TEXT NOT NULL,
          answers TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          submitted_at TEXT NOT NULL,
          reviewed_at TEXT,
          reviewed_by TEXT,
          notes TEXT
        )`, (err) => {
          if (err) {
            Logger.error('Error creating applications table:', err);
            reject(err);
          } else {
            Logger.info('Application database tables created successfully');
            resolve();
          }
        });

        db.run(`CREATE TABLE IF NOT EXISTS application_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          action TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          details TEXT
        )`);
      });
    });
  });
}

async function saveApplication(userData) {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    const answersJson = JSON.stringify(userData.answers);
    
    db.run(
      `INSERT INTO applications (user_id, user_tag, user_username, answers, submitted_at)
       VALUES (?, ?, ?, ?, ?)`,
      [userData.user.id, userData.user.tag, userData.user.username, answersJson, now],
      function(err) {
        if (err) {
          Logger.error('Error saving application:', err);
          reject(err);
        } else {
          Logger.info(`Application saved for user ${userData.user.tag}`);
          
          addApplicationHistory(userData.user.id, 'submitted', 'Application submitted');
          
          resolve(this.lastID);
        }
      }
    );
  });
}

async function getLastApplication(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM applications WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1`,
      [userId],
      (err, row) => {
        if (err) {
          Logger.error('Error getting last application:', err);
          reject(err);
        } else {
          if (row && row.answers) {
            row.answers = JSON.parse(row.answers);
          }
          resolve(row);
        }
      }
    );
  });
}

async function getPendingApplications() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM applications WHERE status = 'pending' ORDER BY submitted_at ASC`,
      [],
      (err, rows) => {
        if (err) {
          Logger.error('Error getting pending applications:', err);
          reject(err);
        } else {
          const applications = rows.map(row => {
            if (row.answers) {
              row.answers = JSON.parse(row.answers);
            }
            return row;
          });
          resolve(applications);
        }
      }
    );
  });
}


async function updateApplicationStatus(applicationId, status, reviewerId, notes = null) {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    
    db.run(
      `UPDATE applications SET status = ?, reviewed_at = ?, reviewed_by = ?, notes = ? WHERE id = ?`,
      [status, now, reviewerId, notes, applicationId],
      function(err) {
        if (err) {
          Logger.error('Error updating application status:', err);
          reject(err);
        } else {
          Logger.info(`Application ${applicationId} status updated to ${status}`);
          resolve();
        }
      }
    );
  });
}

async function addApplicationHistory(userId, action, details = null) {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    
    db.run(
      `INSERT INTO application_history (user_id, action, timestamp, details) VALUES (?, ?, ?, ?)`,
      [userId, action, now, details],
      function(err) {
        if (err) {
          Logger.error('Error adding application history:', err);
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

async function getUserApplicationHistory(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM application_history WHERE user_id = ? ORDER BY timestamp DESC`,
      [userId],
      (err, rows) => {
        if (err) {
          Logger.error('Error getting user application history:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

async function canUserApply(userId) {
  return new Promise((resolve, reject) => {
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    const yesterdayISO = yesterday.toISOString();
    
    db.get(
      `SELECT COUNT(*) as count FROM applications WHERE user_id = ? AND submitted_at > ?`,
      [userId, yesterdayISO],
      (err, row) => {
        if (err) {
          Logger.error('Error checking user application eligibility:', err);
          reject(err);
        } else {
          const canApply = row.count === 0;
          resolve({
            canApply: canApply,
            reason: canApply ? null : 'You have already submitted an application in the last 24 hours',
            remainingTime: canApply ? 0 : 24 * 60 * 60 * 1000
          });
        }
      }
    );
  });
}

module.exports = {
  initializeApplicationDatabase,
  saveApplication,
  getLastApplication,
  getPendingApplications,
  updateApplicationStatus,
  addApplicationHistory,
  getUserApplicationHistory,
  canUserApply
};