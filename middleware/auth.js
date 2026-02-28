const jwt = require('jsonwebtoken');
const db = require('../app').get('db');
const JWT_SECRET = require('../app').get('JWT_SECRET');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Требуется авторизация' });

    db.get('SELECT * FROM sessions WHERE token = ? AND expiresAt > ?', [token, Math.floor(Date.now() / 1000)], (err, session) => {
        if (err || !session) return res.status(403).json({ error: 'Недействительный токен' });

        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) return res.status(403).json({ error: 'Недействительный токен' });

            db.get('SELECT * FROM users WHERE id = ?', [decoded.userId], (err, user) => {
                if (err || !user) return res.status(403).json({ error: 'Пользователь не найден' });
                
                if (user.isBanned) return res.status(403).json({ error: 'Пользователь забанен' });
                
                req.user = user;
                next();
            });
        });
    });
};

const isAdmin = (req, res, next) => {
    if (req.user.username !== 'IronDN') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    next();
};

module.exports = { authenticateToken, isAdmin };
