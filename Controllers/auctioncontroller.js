const db = require('../app').get('db');

exports.getItems = (req, res) => {
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
        (err, items) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка получения лотов' });
            }

            res.json({ items });
        }
    );
};

exports.buyItem = (req, res) => {
    const { itemId } = req.body;

    db.serialize(() => {
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
             WHERE a.id = ? AND a.isActive = 1`,
            [itemId],
            (err, item) => {
                if (err || !item) {
                    return res.status(404).json({ error: 'Лот не найден' });
                }

                if (item.itemType === 'username' && item.existingUserId) {
                    return res.status(400).json({ error: 'Этот юзернейм уже занят' });
                }

                db.get('SELECT stars FROM users WHERE id = ?', [req.user.id], (err, user) => {
                    if (err || !user) {
                        return res.status(404).json({ error: 'Пользователь не найден' });
                    }

                    if (user.stars < item.price) {
                        return res.status(400).json({ error: 'Недостаточно звёзд' });
                    }

                    db.run(
                        'UPDATE users SET stars = stars - ? WHERE id = ?',
                        [item.price, req.user.id],
                        function(err) {
                            if (err) {
                                return res.status(500).json({ error: 'Ошибка списания звёзд' });
                            }

                            const completePurchase = () => {
                                db.run(
                                    'UPDATE auctions SET isActive = 0 WHERE id = ?',
                                    [itemId],
                                    (err) => {
                                        if (err) {
                                            console.error('Ошибка деактивации лота:', err);
                                        }
                                    }
                                );

                                db.run(
                                    'INSERT INTO starTransactions (userId, amount, type, description) VALUES (?, ?, ?, ?)',
                                    [req.user.id, -item.price, 'auction', `Покупка на аукционе: ${item.itemName}`],
                                    (err) => {
                                        if (err) {
                                            console.error('Ошибка записи транзакции:', err);
                                        }
                                    }
                                );

                                res.json({ 
                                    success: true, 
                                    message: 'Покупка успешно совершена'
                                });
                            };

                            if (item.itemType === 'username') {
                                db.run(
                                    'UPDATE usernames SET userId = ?, isPrimary = 0 WHERE id = ?',
                                    [req.user.id, item.itemId],
                                    (err) => {
                                        if (err) {
                                            return res.status(500).json({ error: 'Ошибка добавления username' });
                                        }
                                        completePurchase();
                                    }
                                );
                            } else {
                                db.run(
                                    'INSERT INTO userGifts (userId, giftId) VALUES (?, ?)',
                                    [req.user.id, item.itemId],
                                    (err) => {
                                        if (err) {
                                            return res.status(500).json({ error: 'Ошибка добавления подарка' });
                                        }
                                        completePurchase();
                                    }
                                );
                            }
                        }
                    );
                });
            }
        );
    });
};