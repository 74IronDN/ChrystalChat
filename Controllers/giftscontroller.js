const db = require('../app').get('db');

exports.getGifts = (req, res) => {
    db.serialize(() => {
        db.all(
            `SELECT ng.*, ug.receivedAt, ug.isAnonymous, 
                    u.nickname as senderNickname, u.username as senderUsername
             FROM userGifts ug
             JOIN nftGifts ng ON ug.giftId = ng.id
             LEFT JOIN users u ON ug.senderId = u.id
             WHERE ug.userId = ?
             ORDER BY ug.receivedAt DESC`,
            [req.user.id],
            (err, myGifts) => {
                if (err) {
                    return res.status(500).json({ error: 'Ошибка получения подарков' });
                }

                db.all(
                    'SELECT * FROM nftGifts ORDER BY price ASC',
                    [],
                    (err, availableGifts) => {
                        if (err) {
                            return res.status(500).json({ error: 'Ошибка получения подарков' });
                        }

                        res.json({ myGifts, availableGifts });
                    }
                );
            }
        );
    });
};

exports.buyGift = (req, res) => {
    const { giftId } = req.body;

    db.serialize(() => {
        db.get('SELECT * FROM nftGifts WHERE id = ?', [giftId], (err, gift) => {
            if (err || !gift) {
                return res.status(404).json({ error: 'Подарок не найден' });
            }

            db.get('SELECT stars FROM users WHERE id = ?', [req.user.id], (err, user) => {
                if (err || !user) {
                    return res.status(404).json({ error: 'Пользователь не найден' });
                }

                if (user.stars < gift.price) {
                    return res.status(400).json({ error: 'Недостаточно звёзд' });
                }

                db.run(
                    'UPDATE users SET stars = stars - ? WHERE id = ?',
                    [gift.price, req.user.id],
                    function(err) {
                        if (err) {
                            return res.status(500).json({ error: 'Ошибка списания звёзд' });
                        }

                        db.run(
                            'INSERT INTO userGifts (userId, giftId) VALUES (?, ?)',
                            [req.user.id, giftId],
                            function(err) {
                                if (err) {
                                    return res.status(500).json({ error: 'Ошибка добавления подарка' });
                                }

                                db.run(
                                    'INSERT INTO starTransactions (userId, amount, type, description) VALUES (?, ?, ?, ?)',
                                    [req.user.id, -gift.price, 'purchase', `Покупка подарка: ${gift.name}`],
                                    (err) => {
                                        if (err) {
                                            console.error('Ошибка записи транзакции:', err);
                                        }
                                    }
                                );

                                res.json({ 
                                    success: true, 
                                    message: 'Подарок успешно куплен',
                                    gift
                                });
                            }
                        );
                    }
                );
            });
        });
    });
};

exports.sendGift = (req, res) => {
    const { giftId, receiverId, isAnonymous } = req.body;

    if (!giftId || !receiverId) {
        return res.status(400).json({ error: 'Не указан подарок или получатель' });
    }

    db.serialize(() => {
        db.get(
            'SELECT * FROM userGifts WHERE userId = ? AND giftId = ?',
            [req.user.id, giftId],
            (err, userGift) => {
                if (err || !userGift) {
                    return res.status(404).json({ error: 'У вас нет такого подарка' });
                }

                db.get('SELECT * FROM nftGifts WHERE id = ?', [giftId], (err, gift) => {
                    if (err || !gift) {
                        return res.status(404).json({ error: 'Подарок не найден' });
                    }

                    db.run(
                        'DELETE FROM userGifts WHERE id = ?',
                        [userGift.id],
                        function(err) {
                            if (err) {
                                return res.status(500).json({ error: 'Ошибка удаления подарка' });
                            }

                            db.run(
                                'INSERT INTO userGifts (userId, giftId, senderId, isAnonymous) VALUES (?, ?, ?, ?)',
                                [receiverId, giftId, req.user.id, isAnonymous ? 1 : 0],
                                function(err) {
                                    if (err) {
                                        return res.status(500).json({ error: 'Ошибка отправки подарка' });
                                    }

                                    res.json({ 
                                        success: true, 
                                        message: 'Подарок успешно отправлен'
                                    });
                                }
                            );
                        }
                    );
                });
            }
        );
    });
};