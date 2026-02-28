const db = require('../app').get('db');

class ChannelModel {
    static create(name, description, allowComments, ownerId, callback) {
        db.run(
            'INSERT INTO channels (name, description, allowComments, ownerId) VALUES (?, ?, ?, ?)',
            [name, description, allowComments ? 1 : 0, ownerId],
            function(err) {
                callback(err, this?.lastID);
            }
        );
    }

    static findById(id, callback) {
        db.get(
            `SELECT c.*, 
                    (SELECT COUNT(*) FROM channelSubscribers WHERE channelId = c.id) as subscriberCount
             FROM channels c
             WHERE c.id = ?`,
            [id],
            callback
        );
    }

    static getUserChannels(userId, callback) {
        db.all(
            `SELECT c.*, 
                    (SELECT COUNT(*) FROM channelSubscribers WHERE channelId = c.id) as subscriberCount,
                    cs.role as userRole
             FROM channels c
             JOIN channelSubscribers cs ON c.id = cs.channelId
             WHERE cs.userId = ?
             ORDER BY c.createdAt DESC`,
            [userId],
            callback
        );
    }

    static addSubscriber(channelId, userId, role = 'subscriber', callback) {
        db.run(
            'INSERT OR IGNORE INTO channelSubscribers (channelId, userId, role) VALUES (?, ?, ?)',
            [channelId, userId, role],
            callback
        );
    }

    static removeSubscriber(channelId, userId, callback) {
        db.run(
            'DELETE FROM channelSubscribers WHERE channelId = ? AND userId = ?',
            [channelId, userId],
            callback
        );
    }

    static getSubscribers(channelId, callback) {
        db.all(
            `SELECT u.id, u.nickname, u.username, cs.role
             FROM channelSubscribers cs
             JOIN users u ON cs.userId = u.id
             WHERE cs.channelId = ?`,
            [channelId],
            callback
        );
    }

    static getUserRole(channelId, userId, callback) {
        db.get(
            'SELECT role FROM channelSubscribers WHERE channelId = ? AND userId = ?',
            [channelId, userId],
            callback
        );
    }

    static updateSubscriberRole(channelId, userId, role, callback) {
        db.run(
            'UPDATE channelSubscribers SET role = ? WHERE channelId = ? AND userId = ?',
            [role, channelId, userId],
            callback
        );
    }

    static update(id, data, callback) {
        db.run(
            `UPDATE channels 
             SET name = COALESCE(?, name),
                 description = COALESCE(?, description),
                 allowComments = COALESCE(?, allowComments)
             WHERE id = ?`,
            [data.name, data.description, data.allowComments, id],
            callback
        );
    }

    static delete(id, callback) {
        db.run('DELETE FROM channels WHERE id = ?', [id], callback);
    }
}

module.exports = ChannelModel;