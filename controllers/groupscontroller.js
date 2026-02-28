const db = require('../app').get('db');

exports.createGroup = (req, res) => {
    const { name, description, isPrivate = true, allowInvites = true } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Название группы обязательно' });
    }

    db.serialize(() => {
        db.run(
            `INSERT INTO groups (name, description, isPrivate, allowInvites, ownerId)
             VALUES (?, ?, ?, ?, ?)`,
            [name, description, isPrivate ? 1 : 0, allowInvites ? 1 : 0, req.user.id],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Ошибка создания группы' });
                }

                const groupId = this.lastID;

                db.run(
                    'INSERT INTO groupMembers (groupId, userId, role) VALUES (?, ?, ?)',
                    [groupId, req.user.id, 'owner'],
                    (err) => {
                        if (err) {
                            return res.status(500).json({ error: 'Ошибка добавления создателя' });
                        }

                        res.json({ 
                            success: true, 
                            groupId,
                            group: {
                                id: groupId,
                                name,
                                description,
                                isPrivate,
                                allowInvites,
                                ownerId: req.user.id
                            }
                        });
                    }
                );
            }
        );
    });
};

exports.getUserGroups = (req, res) => {
    db.all(
        `SELECT g.*, 
                (SELECT COUNT(*) FROM groupMembers WHERE groupId = g.id) as memberCount,
                gm.role as userRole
         FROM groups g
         JOIN groupMembers gm ON g.id = gm.groupId
         WHERE gm.userId = ?
         ORDER BY g.createdAt DESC`,
        [req.user.id],
        (err, groups) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка получения групп' });
            }

            res.json({ groups });
        }
    );
};

exports.getGroupInfo = (req, res) => {
    const groupId = parseInt(req.params.groupId);

    db.get(
        `SELECT g.*, 
                (SELECT COUNT(*) FROM groupMembers WHERE groupId = g.id) as memberCount,
                gm.role as userRole
         FROM groups g
         JOIN groupMembers gm ON g.id = gm.groupId
         WHERE g.id = ? AND gm.userId = ?`,
        [groupId, req.user.id],
        (err, group) => {
            if (err || !group) {
                return res.status(404).json({ error: 'Группа не найдена' });
            }

            db.all(
                `SELECT u.id, u.nickname, u.username, gm.role
                 FROM groupMembers gm
                 JOIN users u ON gm.userId = u.id
                 WHERE gm.groupId = ?`,
                [groupId],
                (err, members) => {
                    if (err) {
                        return res.status(500).json({ error: 'Ошибка получения участников' });
                    }

                    res.json({ group, members });
                }
            );
        }
    );
};

exports.addMember = (req, res) => {
    const groupId = parseInt(req.params.groupId);
    const { userId } = req.body;

    db.get(
        'SELECT role FROM groupMembers WHERE groupId = ? AND userId = ?',
        [groupId, req.user.id],
        (err, member) => {
            if (err || !member || !['owner', 'admin'].includes(member.role)) {
                return res.status(403).json({ error: 'Недостаточно прав' });
            }

            db.get(
                'SELECT allowGroupInvites FROM users WHERE id = ?',
                [userId],
                (err, user) => {
                    if (err || !user) {
                        return res.status(404).json({ error: 'Пользователь не найден' });
                    }

                    if (!user.allowGroupInvites) {
                        return res.status(403).json({ error: 'Пользователь запретил приглашения в группы' });
                    }

                    db.run(
                        'INSERT OR IGNORE INTO groupMembers (groupId, userId, role) VALUES (?, ?, ?)',
                        [groupId, userId, 'member'],
                        function(err) {
                            if (err) {
                                return res.status(500).json({ error: 'Ошибка добавления участника' });
                            }

                            res.json({ success: true });
                        }
                    );
                }
            );
        }
    );
};

exports.updateMemberRole = (req, res) => {
    const groupId = parseInt(req.params.groupId);
    const targetUserId = parseInt(req.params.userId);
    const { role } = req.body;

    db.get(
        'SELECT role FROM groupMembers WHERE groupId = ? AND userId = ?',
        [groupId, req.user.id],
        (err, member) => {
            if (err || !member || member.role !== 'owner') {
                return res.status(403).json({ error: 'Недостаточно прав' });
            }

            if (targetUserId === req.user.id) {
                return res.status(400).json({ error: 'Нельзя изменить свою роль' });
            }

            db.run(
                'UPDATE groupMembers SET role = ? WHERE groupId = ? AND userId = ?',
                [role, groupId, targetUserId],
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

exports.removeMember = (req, res) => {
    const groupId = parseInt(req.params.groupId);
    const targetUserId = parseInt(req.params.userId);

    db.get(
        'SELECT role FROM groupMembers WHERE groupId = ? AND userId = ?',
        [groupId, req.user.id],
        (err, member) => {
            if (err || !member) {
                return res.status(403).json({ error: 'Недостаточно прав' });
            }

            if (targetUserId === req.user.id && member.role === 'owner') {
                return res.status(400).json({ error: 'Владелец не может покинуть группу' });
            }

            const deleteMember = () => {
                db.run(
                    'DELETE FROM groupMembers WHERE groupId = ? AND userId = ?',
                    [groupId, targetUserId],
                    function(err) {
                        if (err) {
                            return res.status(500).json({ error: 'Ошибка удаления участника' });
                        }

                        res.json({ success: true });
                    }
                );
            };

            if (member.role !== 'owner') {
                db.get(
                    'SELECT role FROM groupMembers WHERE groupId = ? AND userId = ?',
                    [groupId, targetUserId],
                    (err, targetMember) => {
                        if (targetMember && targetMember.role === 'admin') {
                            return res.status(403).json({ error: 'Недостаточно прав' });
                        }
                        deleteMember();
                    }
                );
            } else {
                deleteMember();
            }
        }
    );
};

exports.updateGroup = (req, res) => {
    const groupId = parseInt(req.params.groupId);
    const { name, description, isPrivate, allowInvites, allowMessages } = req.body;

    db.get(
        'SELECT role FROM groupMembers WHERE groupId = ? AND userId = ?',
        [groupId, req.user.id],
        (err, member) => {
            if (err || !member || !['owner', 'admin'].includes(member.role)) {
                return res.status(403).json({ error: 'Недостаточно прав' });
            }

            db.run(
                `UPDATE groups 
                 SET name = COALESCE(?, name),
                     description = COALESCE(?, description),
                     isPrivate = COALESCE(?, isPrivate),
                     allowInvites = COALESCE(?, allowInvites),
                     allowMessages = COALESCE(?, allowMessages)
                 WHERE id = ?`,
                [name, description, isPrivate, allowInvites, allowMessages, groupId],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Ошибка обновления группы' });
                    }

                    res.json({ success: true });
                }
            );
        }
    );
};

exports.deleteGroup = (req, res) => {
    const groupId = parseInt(req.params.groupId);

    db.get(
        'SELECT role FROM groupMembers WHERE groupId = ? AND userId = ?',
        [groupId, req.user.id],
        (err, member) => {
            if (err || !member || member.role !== 'owner') {
                return res.status(403).json({ error: 'Только владелец может удалить группу' });
            }

            db.serialize(() => {
                db.run('DELETE FROM messages WHERE groupId = ?', [groupId]);
                db.run('DELETE FROM groupMembers WHERE groupId = ?', [groupId]);
                db.run('DELETE FROM groups WHERE id = ?', [groupId], function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Ошибка удаления группы' });
                    }

                    res.json({ success: true });
                });
            });
        }
    );
};