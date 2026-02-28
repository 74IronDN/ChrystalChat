const db = require('../app').get('db');

class AuctionModel {
    static getActiveItems(callback) {
        db.all(
            `SELECT a.*,
                    CASE 
                        WHEN a.itemType = 'username' THEN u.username
                        ELSE ng.name
                    END as name
             FROM auctions a
             LEFT JOIN usernames u ON a.itemType = 'username' AND a.itemId = u.id
             LEFT JOIN nftGifts ng ON a.itemType = 'nft' AND a.itemId = ng.id
             WHERE a.isActive = 1
             ORDER BY a.createdAt DESC`,
            [],
            callback
        );
    }

    static findById(id, callback) {
        db.get(
            `SELECT a.*,
                    CASE 
                        WHEN a.itemType = 'username' THEN u.username
                        ELSE ng.name
                    END as itemName,
                    CASE 
                        WHEN a.itemType = 'username' THEN u.userId
                        ELSE NULL
                    END as existingUserId
             FROM auctions a
             LEFT JOIN usernames u ON a.itemType = 'username' AND a.itemId = u.id
             LEFT JOIN nftGifts ng ON a.itemType = 'nft' AND a.itemId = ng.id
             WHERE a.id = ?`,
            [id],
            callback
        );
    }

    static create(itemType, itemId, price, callback) {
        db.run(
            'INSERT INTO auctions (itemType, itemId, price) VALUES (?, ?, ?)',
            [itemType, itemId, price],
            function(err) {
                callback(err, this?.lastID);
            }
        );
    }

    static deactivate(id, callback) {
        db.run('UPDATE auctions SET isActive = 0 WHERE id = ?', [id], callback);
    }

    static delete(id, callback) {
        db.run('DELETE FROM auctions WHERE id = ?', [id], callback);
    }
}

module.exports = AuctionModel;
