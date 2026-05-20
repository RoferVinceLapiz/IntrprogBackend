const jwt = require('jsonwebtoken');
const db = require('../_helpers/db');
require('dotenv').config();

module.exports = authorize;

function authorize(roles = []) {
    if (typeof roles === 'string') roles = [roles];

    return [
        async (req, res, next) => {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];
            if (!token) return res.status(401).json({ message: 'Unauthorized' });

            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user = await db.Account.findByPk(decoded.id);
                if (!req.user || (roles.length && !roles.includes(req.user.role)))
                    return res.status(401).json({ message: 'Unauthorized' });
                next();
            } catch {
                return res.status(401).json({ message: 'Unauthorized' });
            }
        }
    ];
}