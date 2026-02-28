const db = require('../app').get('db');

class GroupModel {
    static create(name, description, isPrivate, allowInvites, ownerId, callback) {
        db.run(
            `INSERT INTO groups (name, description, isPrivate, allowInvites, ownerId)
             VALUES (?, ?, ?, ?, ?)`,
            [name, description, isPrivate ? 1 : 0, allowInvites ? 1 : 0, ownerId],
            function(err) {
                callback(err, this?.lastID);
            }
        );
    }

    static findById(id, callback) {
        db.get(
            `SELECT g.*, 
                    (SELECT COUNT(*) FROM groupMembers WHERE groupId = g.id) as memberCount
             FROM groups g
             WHERE g.id = ?`,
            [id],
            callback
        );
    }

    static getUserGroups(userId, callback) {
        db.all(
            `SELECT g.*, 
                    (SELECT COUNT(*) FROM groupMembers WHERE groupId = g.id) as memberCount,
                    gm.role as userRole
             FROM groups g
             JOIN groupMembers gm ON g.id = gm.groupId
             WHERE gm.userId = ?
             ORDER BY g.createdAt DESC`,
            [userId],
            callback
        );
    }

    static addMember(groupId, userId, role = 'member', callback) {
        db.run(
            'INSERT OR IGNORE INTO groupMembers (groupId, userId, role) VALUES (?, ?, ?)',
            [groupId, userId, role],
            callback
        );
    }

    static removeMember(groupId, userId, callback) {
        db.run(
            'DELETE FROM groupMembers WHERE groupId = ? AND userId = ?',
            [groupId, userId],
            callback
        );
    }

    static getMembers(groupId, callback) {
        db.all(
            `SELECT u.id, u.nickname, u.username, gm.role
             FROM groupMembers gm
             JOIN users u ON gm.userId = u.id
             WHERE gm.groupId = ?`,
            [groupId],
            callback
        );
    }

    static getUserRole(groupId, userId, callback) {
        db.get(
            'SELECT role FROM groupMembers WHERE groupId = ? AND userId = ?',
            [groupId, userId],
            callback
        );
    }

    static updateMemberRole(groupId, userId, role, callback) {
        db.run(
            'UPDATE groupMembers SET role = ? WHERE groupId = ? AND userId = ?',
            [role, groupId, userId],
            callback
        );
    }

    static update(id, data, callback) {
        db.run(
            `UPDATE groups 
             SET name = COALESCE(?, name),
                 description = COALESCE(?, description),
                 isPrivate = COALESCE(?, isPrivate),
                 allowInvites = COALESCE(?, allowInvites),
                 allowMessages = COALESCE(?, allowMessages)
             WHERE id = ?`,
            [data.name, data.description, data.isPrivate, data.allowInvites, data.allowMessages, id],
            callback
        );
    }

    static delete(id, callback) {
        db.run('DELETE FROM groups WHERE id = ?', [id], callback);
    }
}

module.exports = GroupModel;