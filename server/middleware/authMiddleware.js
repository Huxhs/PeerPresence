const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function protect(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'No token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User not found' });

    req.user = user; // attach full mongoose doc
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};
