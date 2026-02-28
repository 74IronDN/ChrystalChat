const db = require('../app').get('db');

class UserModel {
    static create(nickname, passwordHash, callback) {
        db.run(
            'INSERT INTO users (nickname, passwordHash) VALUES (?, ?)',
            [nickname, passwordHash],
            function(err) {
                callback(err, this?.lastID);
            }
        );
    }

    static findByNickname(nickname, callback) {
        db.get('SELECT * FROM users WHERE nickname = ?', [nickname], callback);
    }

    static findByUsername(username, callback) {
        db.get('SELECT * FROM users WHERE username = ?', [username], callback);
    }

    static findById(id, callback) {
        db.get('SELECT * FROM users WHERE id = ?', [id], callback);
    }

    static updateUsername(userId, username, callback) {
        db.run('UPDATE users SET username = ? WHERE id = ?', [username, userId], callback);
    }

    static updateTheme(userId, theme, callback) {
        db.run('UPDATE users SET theme = ? WHERE id = ?', [theme, userId], callback);
    }

    static updatePrivacy(userId, settings, callback) {
        db.run(
            `UPDATE users 
             SET allowGroupInvites = ?, allowChannelInvites = ?, 
                 showOnlineStatus = ?, showTypingStatus = ?
             WHERE id = ?`,
            [settings.allowGroupInvites, settings.allowChannelInvites, 
             settings.showOnlineStatus, settings.showTypingStatus, userId],
            callback
        );
    }

    static addStars(userId, amount, callback) {
        db.run('UPDATE users SET stars = stars + ? WHERE id = ?', [amount, userId], callback);
    }

    static removeStars(userId, amount, callback) {
        db.run('UPDATE users SET stars = stars - ? WHERE id = ?', [amount, userId], callback);
    }

    static setPremium(userId, until, callback) {
        db.run('UPDATE users SET premiumUntil = ? WHERE id = ?', [until, userId], callback);
    }

    static search(query, callback) {
        db.all(
            'SELECT id, nickname, username FROM users WHERE nickname LIKE ? OR username LIKE ? LIMIT 20',
            [`%${query}%`, `%${query}%`],
            callback
        );
    }
}

module.exports = UserModel;