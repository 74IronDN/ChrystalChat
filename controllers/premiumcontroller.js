const db = require('../app').get('db');

exports.getStatus = (req, res) => {
    db.get('SELECT premiumUntil FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const isActive = user.premiumUntil > Math.floor(Date.now() / 1000);
        
        res.json({ 
            isActive,
            premiumUntil: user.premiumUntil,
            expiresIn: isActive ? user.premiumUntil - Math.floor(Date.now() / 1000) : 0
        });
    });
};

exports.purchasePremium = (req, res) => {
    const { duration } = req.body; // duration в днях

    if (!duration || ![30, 90, 365].includes(duration)) {
        return res.status(400).json({ error: 'Неверный срок премиум' });
    }

    // Здесь должна быть интеграция с DonationAlerts
    // В реальном проекте нужно обрабатывать webhook от DonationAlerts

    res.json({ 
        success: true, 
        message: 'Покупка обрабатывается. Премиум будет активирован после подтверждения платежа.',
        redirectUrl: 'https://www.donationalerts.com/r/irondn'
    });
};