const db = require('../app').get('db');

exports.getProfile = (req, res) => {
    db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json({
            user: {
                id: user.id,
                nickname: user.nickname,
                username: user.username,
                theme: user.theme,
                stars: user.stars,
                premiumUntil: user.premiumUntil,
                allowGroupInvites: user.allowGroupInvites,
                allowChannelInvites: user.allowChannelInvites,
                showOnlineStatus: user.showOnlineStatus,
                showTypingStatus: user.showTypingStatus
            }
        });
    });
};

exports.searchUsers = (req, res) => {
    const query = req.query.q;

    if (!query || query.length < 2) {
        return res.json({ users: [] });
    }

    db.all(
        `SELECT id, nickname, username, showOnlineStatus 
         FROM users 
         WHERE nickname LIKE ? OR username LIKE ? 
         LIMIT 20`,
        [`%${query}%`, `%${query}%`],
        (err, users) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка поиска' });
            }

            res.json({ users });
        }
    );
};

exports.getUserByUsername = (req, res) => {
    const username = req.params.username;

    db.get(
        'SELECT id, nickname, username, showOnlineStatus FROM users WHERE username = ?',
        [username],
        (err, user) => {
            if (err || !user) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }

            res.json({ user });
        }
    );
};

exports.getChats = (req, res) => {
    db.all(
        `SELECT DISTINCT 
            u.id as userId,
            u.nickname,
            u.username,
            u.showOnlineStatus as online,
            (SELECT MAX(createdAt) FROM messages 
             WHERE (senderId = ? AND receiverId = u.id) 
                OR (senderId = u.id AND receiverId = ?)) as lastMessageTime
         FROM users u
         WHERE u.id != ?
           AND EXISTS (
               SELECT 1 FROM messages 
               WHERE (senderId = ? AND receiverId = u.id) 
                  OR (senderId = u.id AND receiverId = ?)
           )
         ORDER BY lastMessageTime DESC`,
        [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id],
        (err, chats) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка получения чатов' });
            }

            res.json({ chats });
        }
    );
};

exports.updateTheme = (req, res) => {
    const { theme } = req.body;

    if (!['light', 'dark'].includes(theme)) {
        return res.status(400).json({ error: 'Неверная тема' });
    }

    db.run(
        'UPDATE users SET theme = ? WHERE id = ?',
        [theme, req.user.id],
        (err) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка смены темы' });
            }

            res.json({ success: true, theme });
        }
    );
};

exports.updatePrivacy = (req, res) => {
    const { allowGroupInvites, allowChannelInvites, showOnlineStatus, showTypingStatus } = req.body;

    db.run(
        `UPDATE users 
         SET allowGroupInvites = ?, allowChannelInvites = ?, 
             showOnlineStatus = ?, showTypingStatus = ?
         WHERE id = ?`,
        [allowGroupInvites, allowChannelInvites, showOnlineStatus, showTypingStatus, req.user.id],
        (err) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка сохранения настроек' });
            }

            res.json({ success: true });
        }
    );
};