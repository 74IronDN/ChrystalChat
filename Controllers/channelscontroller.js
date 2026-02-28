const db = require('../app').get('db');

exports.createChannel = (req, res) => {
    const { name, description, allowComments = true } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Название канала обязательно' });
    }

    db.serialize(() => {
        db.run(
            'INSERT INTO channels (name, description, allowComments, ownerId) VALUES (?, ?, ?, ?)',
            [name, description, allowComments ? 1 : 0, req.user.id],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Ошибка создания канала' });
                }

                const channelId = this.lastID;

                db.run(
                    'INSERT INTO channelSubscribers (channelId, userId, role) VALUES (?, ?, ?)',
                    [channelId, req.user.id, 'owner'],
                    (err) => {
                        if (err) {
                            return res.status(500).json({ error: 'Ошибка добавления создателя' });
                        }

                        res.json({ 
                            success: true, 
                            channelId,
                            channel: {
                                id: channelId,
                                name,
                                description,
                                allowComments,
                                ownerId: req.user.id
                            }
                        });
                    }
                );
            }
        );
    });
};

exports.getUserChannels = (req, res) => {
    db.all(
        `SELECT c.*, 
                (SELECT COUNT(*) FROM channelSubscribers WHERE channelId = c.id) as subscriberCount,
                cs.role as userRole
         FROM channels c
         JOIN channelSubscribers cs ON c.id = cs.channelId
         WHERE cs.userId = ?
         ORDER BY c.createdAt DESC`,
        [req.user.id],
        (err, channels) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка получения каналов' });
            }

            res.json({ channels });
        }
    );
};

exports.getChannelInfo = (req, res) => {
    const channelId = parseInt(req.params.channelId);

    db.get(
        `SELECT c.*, 
                (SELECT COUNT(*) FROM channelSubscribers WHERE channelId = c.id) as subscriberCount,
                cs.role as userRole
         FROM channels c
         JOIN channelSubscribers cs ON c.id = cs.channelId
         WHERE c.id = ? AND cs.userId = ?`,
        [channelId, req.user.id],
        (err, channel) => {
            if (err || !channel) {
                return res.status(404).json({ error: 'Канал не найден' });
            }

            db.all(
                `SELECT u.id, u.nickname, u.username, cs.role
                 FROM channelSubscribers cs
                 JOIN users u ON cs.userId = u.id
                 WHERE cs.channelId = ?`,
                [channelId],
                (err, subscribers) => {
                    if (err) {
                        return res.status(500).json({ error: 'Ошибка получения подписчиков' });
                    }

                    res.json({ channel, subscribers });
                }
            );
        }
    );
};

exports.subscribe = (req, res) => {
    const channelId = parseInt(req.params.channelId);

    db.get(
        'SELECT allowChannelInvites FROM users WHERE id = ?',
        [req.user.id],
        (err, user) => {
            if (err || !user) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }

            if (!user.allowChannelInvites) {
                return res.status(403).json({ error: 'Вы запретили подписки на каналы' });
            }

            db.run(
                'INSERT OR IGNORE INTO channelSubscribers (channelId, userId, role) VALUES (?, ?, ?)',
                [channelId, req.user.id, 'subscriber'],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Ошибка подписки' });
                    }

                    res.json({ success: true });
                }
            );
        }
    );
};

exports.unsubscribe = (req, res) => {
    const channelId = parseInt(req.params.channelId);

    db.get(
        'SELECT role FROM channelSubscribers WHERE channelId = ? AND userId = ?',
        [channelId, req.user.id],
        (err, subscriber) => {
            if (err || !subscriber) {
                return res.status(404).json({ error: 'Подписка не найдена' });
            }

            if (subscriber.role === 'owner') {
                return res.status(400).json({ error: 'Владелец не может отписаться от канала' });
            }

            db.run(
                'DELETE FROM channelSubscribers WHERE channelId = ? AND userId = ?',
                [channelId, req.user.id],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Ошибка отписки' });
                    }

                    res.json({ success: true });
                }
            );
        }
    );
};

exports.updateSubscriberRole = (req, res) => {
    const channelId = parseInt(req.params.channelId);
    const targetUserId = parseInt(req.params.userId);
    const { role } = req.body;

    db.get(
        'SELECT role FROM channelSubscribers WHERE channelId = ? AND userId = ?',
        [channelId, req.user.id],
        (err, subscriber) => {
            if (err || !subscriber || subscriber.role !== 'owner') {
                return res.status(403).json({ error: 'Недостаточно прав' });
            }

            if (targetUserId === req.user.id) {
                return res.status(400).json({ error: 'Нельзя изменить свою роль' });
            }

            db.run(
                'UPDATE channelSubscribers SET role = ? WHERE channelId = ? AND userId = ?',
                [role, channelId, targetUserId],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Ошибка изменения роли' });
                    }

                    res.json({ success: true });
                }
            );
        }
    );
};

exports.updateChannel = (req, res) => {
    const channelId = parseInt(req.params.channelId);
    const { name, description, allowComments } = req.body;

    db.get(
        'SELECT role FROM channelSubscribers WHERE channelId = ? AND userId = ?',
        [channelId, req.user.id],
        (err, subscriber) => {
            if (err || !subscriber || !['owner', 'editor'].includes(subscriber.role)) {
                return res.status(403).json({ error: 'Недостаточно прав' });
            }

            db.run(
                `UPDATE channels 
                 SET name = COALESCE(?, name),
                     description = COALESCE(?, description),
                     allowComments = COALESCE(?, allowComments)
                 WHERE id = ?`,
                [name, description, allowComments, channelId],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Ошибка обновления канала' });
                    }

                    res.json({ success: true });
                }
            );
        }
    );
};

exports.deleteChannel = (req, res) => {
    const channelId = parseInt(req.params.channelId);

    db.get(
        'SELECT role FROM channelSubscribers WHERE channelId = ? AND userId = ?',
        [channelId, req.user.id],
        (err, subscriber) => {
            if (err || !subscriber || subscriber.role !== 'owner') {
                return res.status(403).json({ error: 'Только владелец может удалить канал' });
            }

            db.serialize(() => {
                db.run('DELETE FROM messages WHERE channelId = ?', [channelId]);
                db.run('DELETE FROM channelSubscribers WHERE channelId = ?', [channelId]);
                db.run('DELETE FROM channels WHERE id = ?', [channelId], function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Ошибка удаления канала' });
                    }

                    res.json({ success: true });
                });
            });
        }
    );
};