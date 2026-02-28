const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../app').get('db');
const JWT_SECRET = require('../app').get('JWT_SECRET');

exports.register = async (req, res) => {
    const { nickname, password } = req.body;

    if (!nickname || !password) {
        return res.status(400).json({ error: 'Nickname и password обязательны' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Пароль должен быть минимум 6 символов' });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        
        db.run(
            'INSERT INTO users (nickname, passwordHash) VALUES (?, ?)',
            [nickname, passwordHash],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Ошибка создания пользователя' });
                }

                const userId = this.lastID;
                const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
                
                db.run(
                    'INSERT INTO sessions (userId, token, expiresAt) VALUES (?, ?, ?)',
                    [userId, token, Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60],
                    (err) => {
                        if (err) {
                            return res.status(500).json({ error: 'Ошибка создания сессии' });
                        }

                        res.json({
                            token,
                            user: {
                                id: userId,
                                nickname,
                                username: null,
                                theme: 'light',
                                stars: 0,
                                premiumUntil: 0,
                                allowGroupInvites: 1,
                                allowChannelInvites: 1,
                                showOnlineStatus: 1,
                                showTypingStatus: 1
                            }
                        });
                    }
                );
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

exports.setUsername = (req, res) => {
    const { username } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    if (!username) {
        return res.status(400).json({ error: 'Username обязателен' });
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return res.status(400).json({ error: 'Username должен содержать 3-20 символов (буквы, цифры, _)' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Недействительный токен' });
        }

        const userId = decoded.userId;

        db.serialize(() => {
            db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
                if (err) {
                    return res.status(500).json({ error: 'Ошибка проверки username' });
                }

                if (row) {
                    return res.status(400).json({ error: 'Этот юзернейм уже занят' });
                }

                db.run(
                    'UPDATE users SET username = ? WHERE id = ?',
                    [username, userId],
                    function(err) {
                        if (err) {
                            return res.status(500).json({ error: 'Ошибка установки username' });
                        }

                        db.run(
                            'INSERT INTO usernames (userId, username, isPrimary) VALUES (?, ?, 1)',
                            [userId, username],
                            (err) => {
                                if (err) {
                                    return res.status(500).json({ error: 'Ошибка сохранения username' });
                                }

                                db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
                                    if (err) {
                                        return res.status(500).json({ error: 'Ошибка получения данных' });
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
                            }
                        );
                    }
                );
            });
        });
    });
};

exports.login = (req, res) => {
    const { nickname, password } = req.body;

    if (!nickname || !password) {
        return res.status(400).json({ error: 'Nickname и password обязательны' });
    }

    db.get('SELECT * FROM users WHERE nickname = ?', [nickname], async (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Неверный nickname или пароль' });
        }

        if (user.isBanned) {
            return res.status(403).json({ error: 'Аккаунт заблокирован' });
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Неверный nickname или пароль' });
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
        
        db.run(
            'INSERT INTO sessions (userId, token, expiresAt) VALUES (?, ?, ?)',
            [user.id, token, Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60],
            (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Ошибка создания сессии' });
                }

                res.json({
                    token,
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
            }
        );
    });
};

exports.logout = (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        db.run('DELETE FROM sessions WHERE token = ?', [token]);
    }

    res.json({ success: true });
};
