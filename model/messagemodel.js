const db = require('../app').get('db');

class MessageModel {
    static create(senderId, receiverId, groupId, channelId, text, type = 'text', attachment = null, callback) {
        db.run(
            `INSERT INTO messages (senderId, receiverId, groupId, channelId, text, type, attachment)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [senderId, receiverId, groupId, channelId, text, type, attachment],
            function(err) {
                callback(err, this?.lastID);
            }
        );
    }

    static getBetweenUsers(userId1, userId2, limit = 50, callback) {
        db.all(
            `SELECT * FROM messages 
             WHERE (senderId = ? AND receiverId = ?) 
                OR (senderId = ? AND receiverId = ?)
             ORDER BY createdAt ASC
             LIMIT ?`,
            [userId1, userId2, userId2, userId1, limit],
            callback
        );
    }

    static getByGroup(groupId, limit = 100, callback) {
        db.all(
            `SELECT m.*, u.nickname as senderNickname, u.username as senderUsername
             FROM messages m
             LEFT JOIN users u ON m.senderId = u.id
             WHERE m.groupId = ?
             ORDER BY m.createdAt ASC
             LIMIT ?`,
            [groupId, limit],
            callback
        );
    }

    static getByChannel(channelId, limit = 100, callback) {
        db.all(
            `SELECT m.*, u.nickname as senderNickname, u.username as senderUsername
             FROM messages m
             LEFT JOIN users u ON m.senderId = u.id
             WHERE m.channelId = ?
             ORDER BY m.createdAt ASC
             LIMIT ?`,
            [channelId, limit],
            callback
        );
    }

    static update(id, text, callback) {
        db.run(
            'UPDATE messages SET text = ?, edited = 1 WHERE id = ?',
            [text, id],
            callback
        );
    }

    static delete(id, senderId, callback) {
        db.run(
            'DELETE FROM messages WHERE id = ? AND senderId = ?',
            [id, senderId],
            callback
        );
    }

    static deleteByGroup(groupId, callback) {
        db.run('DELETE FROM messages WHERE groupId = ?', [groupId], callback);
    }

    static deleteByChannel(channelId, callback) {
        db.run('DELETE FROM messages WHERE channelId = ?', [channelId], callback);
    }
}

module.exports = MessageModel;