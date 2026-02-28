const db = require('../app').get('db');

exports.getBalance = (req, res) => {
    db.get('SELECT stars FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json({ balance: user.stars });
    });
};

exports.getTransactions = (req, res) => {
    db.all(
        'SELECT * FROM starTransactions WHERE userId = ? ORDER BY createdAt DESC LIMIT 50',
        [req.user.id],
        (err, transactions) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка получения транзакций' });
            }

            res.json({ transactions });
        }
    );
};

exports.purchaseStars = (req, res) => {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Неверная сумма' });
    }

    // Здесь должна быть интеграция с DonationAlerts
    // В реальном проекте нужно обрабатывать webhook от DonationAlerts
    // Пока просто имитируем успешную покупку

    res.json({ 
        success: true, 
        message: 'Покупка обрабатывается. Звёзды будут начислены после подтверждения платежа.',
        redirectUrl: 'https://www.donationalerts.com/r/irondn'
    });
};