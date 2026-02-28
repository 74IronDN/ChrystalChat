const db = require('../app').get('db');

exports.sendMessage = (req, res) => {
    const { receiverId, groupId, channelId, text, type = 'text', attachment } = req.body;

    if (!text && !attachment) {
        return res.status(400).json({ error: 'Сообщение не может быть пустым' });
    }

    if (!receiverId && !groupId && !channelId) {
        return res.status(400).json({ error: 'Не указан получатель' });
    }

    db.run(
        `INSERT INTO messages (senderId, receiverId, groupId, channelId, text, type, attachment)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, receiverId, groupId, channelId, text, type, attachment],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Ошибка отправки сообщения' });
            }

            res.json({ 
                success: true, 
                messageId: this.lastID,
                message: {
                    id: this.lastID,
                    senderId: req.user.id,
                    receiverId,
                    groupId,
                    channelId,
                    text,
                    type,
                    attachment,
                    createdAt: Math.floor(Date.now() / 1000)
                }
            });
        }
    );
};

exports.getMessages = (req, res) => {
    const userId = parseInt(req.params.userId);

    db.all(
        `SELECT * FROM messages 
         WHERE (senderId = ? AND receiverId = ?) 
            OR (senderId = ? AND receiverId = ?)
         ORDER BY createdAt ASC
         LIMIT 50`,
        [req.user.id, userId, userId, req.user.id],
        (err, messages) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка получения сообщений' });
            }

            res.json({ messages });
        }
    );
};

exports.getGroupMessages = (req, res) => {
    const groupId = parseInt(req.params.groupId);

    db.get(
        'SELECT * FROM groupMembers WHERE groupId = ? AND userId = ?',
        [groupId, req.user.id],
        (err, member) => {
            if (err || !member) {
                return res.status(403).json({ error: 'Доступ запрещен' });
            }

            db.all(
                `SELECT m.*, u.nickname as senderNickname, u.username as senderUsername
                 FROM messages m
                 LEFT JOIN users u ON m.senderId = u.id
                 WHERE m.groupId = ?
                 ORDER BY m.createdAt ASC
                 LIMIT 100`,
                [groupId],
                (err, messages) => {
                    if (err) {
                        return res.status(500).json({ error: 'Ошибка получения сообщений' });
                    }

                    res.json({ messages });
                }
            );
        }
    );
};

exports.getChannelMessages = (req, res) => {
    const channelId = parseInt(req.params.channelId);

    db.get(
        'SELECT * FROM channelSubscribers WHERE channelId = ? AND userId = ?',
        [channelId, req.user.id],
        (err, subscriber) => {
            if (err || !subscriber) {
                return res.status(403).json({ error: 'Доступ запрещен' });
            }

            db.all(
                `SELECT m.*, u.nickname as senderNickname, u.username as senderUsername
                 FROM messages m
                 LEFT JOIN users u ON m.senderId = u.id
                 WHERE m.channelId = ?
                 ORDER BY m.createdAt ASC
                 LIMIT 100`,
                [channelId],
                (err, messages) => {
                    if (err) {
                        return res.status(500).json({ error: 'Ошибка получения сообщений' });
                    }

                    res.json({ messages });
                }
            );
        }
    );
};

exports.editMessage = (req, res) => {
    const messageId = parseInt(req.params.messageId);
    const { text } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'Текст сообщения обязателен' });
    }

    db.run(
        'UPDATE messages SET text = ?, edited = 1 WHERE id = ? AND senderId = ?',
        [text, messageId, req.user.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Ошибка редактирования' });
            }

            if (this.changes === 0) {
                return res.status(403).json({ error: 'Нет прав на редактирование' });
            }

            res.json({ success: true });
        }
    );
};

exports.deleteMessage = (req, res) => {
    const messageId = parseInt(req.params.messageId);

    db.run(
        'DELETE FROM messages WHERE id = ? AND senderId = ?',
        [messageId, req.user.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Ошибка удаления' });
            }

            if (this.changes === 0) {
                return res.status(403).json({ error: 'Нет прав на удаление' });
            }

            res.json({ success: true });
        }
    );
};