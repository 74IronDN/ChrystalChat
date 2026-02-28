const db = require('../app').get('db');
const bcrypt = require('bcrypt');

exports.getStats = (req, res) => {
    db.serialize(() => {
        db.get('SELECT COUNT(*) as count FROM users', [], (err, users) => {
            db.get('SELECT COUNT(*) as count FROM messages', [], (err, messages) => {
                db.get('SELECT COUNT(*) as count FROM groups', [], (err, groups) => {
                    db.get('SELECT COUNT(*) as count FROM channels', [], (err, channels) => {
                        res.json({
                            users: users ? users.count : 0,
                            messages: messages ? messages.count : 0,
                            groups: groups ? groups.count : 0,
                            channels: channels ? channels.count : 0
                        });
                    });
                });
            });
        });
    });
};

exports.addStars = (req, res) => {
    const { username, amount } = req.body;

    if (!username || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Неверные данные' });
    }

    db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        db.run(
            'UPDATE users SET stars = stars + ? WHERE id = ?',
            [amount, user.id],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Ошибка начисления звёзд' });
                }

                db.run(
                    'INSERT INTO starTransactions (userId, amount, type, description) VALUES (?, ?, ?, ?)',
                    [user.id, amount, 'admin_add', 'Начислено администратором'],
                    (err) => {
                        if (err) {
                            console.error('Ошибка записи транзакции:', err);
                        }
                    }
                );

                res.json({ success: true });
            }
        );
    });
};

exports.removeStars = (req, res) => {
    const { username, amount } = req.body;

    if (!username || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Неверные данные' });
    }

    db.get('SELECT id, stars FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        if (user.stars < amount) {
            return res.status(400).json({ error: 'Недостаточно звёзд' });
        }

        db.run(
            'UPDATE users SET stars = stars - ? WHERE id = ?',
            [amount, user.id],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Ошибка списания звёзд' });
                }

                db.run(
                    'INSERT INTO starTransactions (userId, amount, type, description) VALUES (?, ?, ?, ?)',
                    [user.id, -amount, 'admin_remove', 'Списано администратором'],
                    (err) => {
                        if (err) {
                            console.error('Ошибка записи транзакции:', err);
                        }
                    }
                );

                res.json({ success: true });
            }
        );
    });
};

exports.addPremium = (req, res) => {
    const { username, duration } = req.body;

    if (!username || !duration || duration <= 0) {
        return res.status(400).json({ error: 'Неверные данные' });
    }

    db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const now = Math.floor(Date.now() / 1000);
        db.run(
            'UPDATE users SET premiumUntil = ? WHERE id = ?',
            [now + duration * 24 * 60 * 60, user.id],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Ошибка выдачи премиум' });
                }

                res.json({ success: true });
            }
        );
    });
};

exports.removePremium = (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ error: 'Не указан username' });
    }

    db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        db.run(
            'UPDATE users SET premiumUntil = 0 WHERE id = ?',
            [user.id],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Ошибка отмены премиум' });
                }

                res.json({ success: true });
            }
        );
    });
};

exports.addGift = (req, res) => {
    const { username, giftId } = req.body;

    if (!username || !giftId) {
        return res.status(400).json({ error: 'Неверные данные' });
    }

    db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        db.get('SELECT * FROM nftGifts WHERE id = ?', [giftId], (err, gift) => {
            if (err || !gift) {
                return res.status(404).json({ error: 'Подарок не найден' });
            }

            db.run(
                'INSERT INTO userGifts (userId, giftId) VALUES (?, ?)',
                [user.id, giftId],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Ошибка добавления подарка' });
                    }

                    res.json({ success: true });
                }
            );
        });
    });
};

exports.removeGift = (req, res) => {
    const { username, giftId } = req.body;

    if (!username || !giftId) {
        return res.status(400).json({ error: 'Неверные данные' });
    }

    db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        db.run(
            'DELETE FROM userGifts WHERE userId = ? AND giftId = ? LIMIT 1',
            [user.id, giftId],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Ошибка удаления подарка' });
                }

                res.json({ success: true });
            }
        );
    });
};

exports.addAuctionItem = (req, res) => {
    const { type, itemId, price } = req.body;

    if (!type || !itemId || !price) {
        return res.status(400).json({ error: 'Не все поля заполнены' });
    }

    if (price <= 0) {
        return res.status(400).json({ error: 'Цена должна быть положительной' });
    }

    const createAuctionItem = () => {
        db.run(
            'INSERT INTO auctions (itemType, itemId, price) VALUES (?, ?, ?)',
            [type, itemId, price],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Ошибка создания лота' });
                }

                res.json({ 
                    success: true, 
                    message: 'Лот успешно создан',
                    auctionId: this.lastID
                });
            }
        );
    };

    if (type === 'username') {
        db.get('SELECT * FROM usernames WHERE id = ?', [itemId], (err, item) => {
            if (err || !item) {
                return res.status(404).json({ error: 'Username не найден' });
            }
            if (item.userId) {
                return res.status(400).json({ error: 'Этот username уже занят' });
            }
            createAuctionItem();
        });
    } else if (type === 'nft') {
        db.get('SELECT * FROM nftGifts WHERE id = ?', [itemId], (err, item) => {
            if (err || !item) {
                return res.status(404).json({ error: 'NFT-подарок не найден' });
            }
            createAuctionItem();
        });
    } else {
        return res.status(400).json({ error: 'Неверный тип предмета' });
    }
};

exports.banUser = (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ error: 'Не указан username' });
    }

    if (username === 'IronDN') {
        return res.status(400).json({ error: 'Нельзя забанить администратора' });
    }

    db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        db.run(
            'UPDATE users SET isBanned = 1 WHERE id = ?',
            [user.id],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Ошибка бана' });
                }

                db.run('DELETE FROM sessions WHERE userId = ?', [user.id]);

                res.json({ success: true });
            }
        );
    });
};

exports.unbanUser = (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ error: 'Не указан username' });
    }

    db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        db.run(
            'UPDATE users SET isBanned = 0 WHERE id = ?',
            [user.id],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Ошибка разбана' });
                }

                res.json({ success: true });
            }
        );
    });
};

exports.deleteUser = (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ error: 'Не указан username' });
    }

    if (username === 'IronDN') {
        return res.status(400).json({ error: 'Нельзя удалить администратора' });
    }

    db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        db.serialize(() => {
            db.run('DELETE FROM sessions WHERE userId = ?', [user.id]);
            db.run('DELETE FROM messages WHERE senderId = ? OR receiverId = ?', [user.id, user.id]);
            db.run('DELETE FROM groupMembers WHERE userId = ?', [user.id]);
            db.run('DELETE FROM channelSubscribers WHERE userId = ?', [user.id]);
            db.run('DELETE FROM userGifts WHERE userId = ? OR senderId = ?', [user.id, user.id]);
            db.run('DELETE FROM starTransactions WHERE userId = ?', [user.id]);
            db.run('DELETE FROM usernames WHERE userId = ?', [user.id]);
            db.run('DELETE FROM users WHERE id = ?', [user.id], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Ошибка удаления пользователя' });
                }

                res.json({ success: true });
            });
        });
    });
};