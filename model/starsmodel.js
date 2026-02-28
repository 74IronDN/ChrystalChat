const db = require('../app').get('db');

class StarsModel {
    static getBalance(userId, callback) {
        db.get('SELECT stars FROM users WHERE id = ?', [userId], callback);
    }

    static add(userId, amount, callback) {
        db.run('UPDATE users SET stars = stars + ? WHERE id = ?', [amount, userId], callback);
    }

    static remove(userId, amount, callback) {
        db.run('UPDATE users SET stars = stars - ? WHERE id = ?', [amount, userId], callback);
    }

    static hasEnough(userId, amount, callback) {
        db.get('SELECT stars FROM users WHERE id = ?', [userId], (err, user) => {
            if (err || !user) {
                return callback(err || new Error('User not found'), false);
            }
            callback(null, user.stars >= amount);
        });
    }

    static addTransaction(userId, amount, type, description, callback) {
        db.run(
            'INSERT INTO starTransactions (userId, amount, type, description) VALUES (?, ?, ?, ?)',
            [userId, amount, type, description],
            callback
        );
    }

    static getTransactions(userId, limit = 50, callback) {
        db.all(
            'SELECT * FROM starTransactions WHERE userId = ? ORDER BY createdAt DESC LIMIT ?',
            [userId, limit],
            callback
        );
    }
}

module.exports = StarsModel;