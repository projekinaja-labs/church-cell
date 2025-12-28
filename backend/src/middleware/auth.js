import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'church-cell-secret-key-change-in-production';

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

export const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

export const requireLeader = (req, res, next) => {
    if (req.user.role !== 'leader' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Leader access required' });
    }
    next();
};

export { JWT_SECRET };
