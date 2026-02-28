const db = require('../app').get('db');

class PremiumModel {
    static getStatus(userId, callback) {
        db.get('SELECT premiumUntil FROM users WHERE id = ?', [userId], callback);
    }

    static isActive(userId, callback) {
        db.get(
            'SELECT premiumUntil FROM users WHERE id = ? AND premiumUntil > ?',
            [userId, Math.floor(Date.now() / 1000)],
            (err, row) => {
                callback(err, !!row);
            }
        );
    }

    static set(userId, until, callback) {
        db.run('UPDATE users SET premiumUntil = ? WHERE id = ?', [until, userId], callback);
    }

    static add(userId, days, callback) {
        const now = Math.floor(Date.now() / 1000);
        db.get('SELECT premiumUntil FROM users WHERE id = ?', [userId], (err, user) => {
            if (err || !user) {
                return callback(err || new Error('User not found'));
            }

            const currentUntil = Math.max(user.premiumUntil, now);
            const newUntil = currentUntil + days * 24 * 60 * 60;

            db.run('UPDATE users SET premiumUntil = ? WHERE id = ?', [newUntil, userId], callback);
        });
    }

    static remove(userId, callback) {
        db.run('UPDATE users SET premiumUntil = 0 WHERE id = ?', [userId], callback);
    }
}

module.exports = PremiumModel;