import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Authenticate WebSocket connection using JWT token
 */
export const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return next(new Error('Invalid or expired token'));
    }

    const user = await User.findByPk(decoded.id);

    if (!user) {
      return next(new Error('User not found'));
    }

    // Attach user to socket
    socket.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
};

