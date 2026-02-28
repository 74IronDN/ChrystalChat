const db = require('../app').get('db');

class GiftModel {
    static getAll(callback) {
        db.all('SELECT * FROM nftGifts ORDER BY price ASC', [], callback);
    }

    static findById(id, callback) {
        db.get('SELECT * FROM nftGifts WHERE id = ?', [id], callback);
    }

    static getUserGifts(userId, callback) {
        db.all(
            `SELECT ng.*, ug.receivedAt, ug.isAnonymous, 
                    u.nickname as senderNickname, u.username as senderUsername
             FROM userGifts ug
             JOIN nftGifts ng ON ug.giftId = ng.id
             LEFT JOIN users u ON ug.senderId = u.id
             WHERE ug.userId = ?
             ORDER BY ug.receivedAt DESC`,
            [userId],
            callback
        );
    }

    static addToUser(userId, giftId, senderId = null, isAnonymous = 0, callback) {
        db.run(
            'INSERT INTO userGifts (userId, giftId, senderId, isAnonymous) VALUES (?, ?, ?, ?)',
            [userId, giftId, senderId, isAnonymous],
            callback
        );
    }

    static removeFromUser(userId, giftId, callback) {
        db.run(
            'DELETE FROM userGifts WHERE userId = ? AND giftId = ? LIMIT 1',
            [userId, giftId],
            callback
        );
    }

    static create(name, description, imageUrl, price, callback) {
        db.run(
            'INSERT INTO nftGifts (name, description, imageUrl, price) VALUES (?, ?, ?, ?)',
            [name, description, imageUrl, price],
            function(err) {
                callback(err, this?.lastID);
            }
        );
    }
}

module.exports = GiftModel;