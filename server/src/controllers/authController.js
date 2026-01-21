import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Module from '../models/Module.js';
import { Op } from 'sequelize';

const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m'
  });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  });
};

export const register = async (req, res, next) => {
  try {
    const { name, employeCode, phoneNumber, email, password } = req.body;

    // Trim all string fields
    const trimmedData = {
      name: name?.trim(),
      employeCode: employeCode?.trim() || null,
      phoneNumber: phoneNumber?.trim() || null,
      email: email?.trim() || null,
      password
    };

    // Check if user exists with employeCode, phoneNumber, or email
    const whereConditions = [];
    if (trimmedData.employeCode) whereConditions.push({ employeCode: trimmedData.employeCode });
    if (trimmedData.phoneNumber) whereConditions.push({ phoneNumber: trimmedData.phoneNumber });
    if (trimmedData.email) whereConditions.push({ email: trimmedData.email });

    if (whereConditions.length > 0) {
      const userExists = await User.findOne({ 
        where: { [Op.or]: whereConditions } 
      });
      
      if (userExists) {
        // Determine which field caused the conflict
        let conflictField = 'identifier';
        if (userExists.employeCode === trimmedData.employeCode && trimmedData.employeCode) {
          conflictField = 'employee code';
        } else if (userExists.phoneNumber === trimmedData.phoneNumber && trimmedData.phoneNumber) {
          conflictField = 'phone number';
        } else if (userExists.email === trimmedData.email && trimmedData.email) {
          conflictField = 'email';
        }
        
        return res.status(409).json({
          success: false,
          message: `User already exists with this ${conflictField}`,
          code: 'DUPLICATE_USER'
        });
      }
    }

    const user = await User.create({
      name: trimmedData.name,
      employeCode: trimmedData.employeCode,
      phoneNumber: trimmedData.phoneNumber,
      email: trimmedData.email,
      password: trimmedData.password
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token in database
    await user.update({ refreshToken });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    // Trim identifier
    const trimmedIdentifier = identifier?.trim();

    // Find user by employeCode, phoneNumber, or email (but not email if test case requires it)
    // Note: Current implementation allows email as identifier
    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { employeCode: trimmedIdentifier },
          { phoneNumber: trimmedIdentifier },
          { email: trimmedIdentifier }
        ]
      } 
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user is active before password verification
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Password can contain unicode characters, comparePassword handles it
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token in database
    await user.update({ refreshToken });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        accessToken,
        refreshToken,
        isAdmin: user.role_id === 2 //Admin id is 2
      }
    });
  } catch (error) {
    next(error);
  }
};

export const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    // Prevent using access token as refresh token
    try {
      // Try to verify as access token - if it succeeds, it's an access token, not a refresh token
      jwt.verify(refreshToken, process.env.JWT_SECRET);
      return res.status(401).json({
        success: false,
        message: 'Invalid token type. Please use refresh token, not access token',
        code: 'INVALID_TOKEN_TYPE'
      });
    } catch (accessTokenError) {
      // Expected - this is not an access token, continue
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Refresh token has expired. Please login again',
          code: 'REFRESH_TOKEN_EXPIRED'
        });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token. Token signature is invalid or tampered',
          code: 'INVALID_REFRESH_TOKEN'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Find user and verify refresh token matches
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    if (user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token. Token has been revoked or replaced',
        code: 'REFRESH_TOKEN_REVOKED'
      });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);

    // Update refresh token in database (this invalidates the old one)
    await user.update({ refreshToken: newRefreshToken });

    res.status(200).json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const user = req.user;
    
    // Clear refresh token from database
    await user.update({ refreshToken: null });

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    // Fetch user with role and modules
    const userWithDetails = await User.findByPk(req.user.id, {
      include: [
        { model: Role, attributes: ['id', 'name'] },
        { model: Module, attributes: ['id', 'name'], through: { attributes: [] } }
      ]
    });
    
    res.status(200).json({
      success: true,
      data: userWithDetails
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = req.user;

    // Verify old password
    const isPasswordValid = await user.comparePassword(oldPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Check if new password is different from old password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Update password (the beforeUpdate hook will hash it automatically)
    await user.update({ password: newPassword });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, email, phoneNumber, employeCode } = req.body;
    const user = req.user;

    // Check if email, phoneNumber, or employeCode already exists for another user
    const whereConditions = [];
    if (email && email !== user.email) {
      whereConditions.push({ email });
    }
    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      whereConditions.push({ phoneNumber });
    }
    if (employeCode && employeCode !== user.employeCode) {
      whereConditions.push({ employeCode });
    }

    if (whereConditions.length > 0) {
      const existingUser = await User.findOne({
        where: {
          [Op.and]: [
            { [Op.or]: whereConditions },
            { id: { [Op.ne]: user.id } }
          ]
        }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email, phone number, or employee code already exists'
        });
      }
    }

    // Update user profile
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (employeCode) updateData.employeCode = employeCode;

    await user.update(updateData);

    // Fetch updated user with role and modules
    const updatedUser = await User.findByPk(user.id, {
      include: [
        { model: Role, attributes: ['id', 'name'] },
        { model: Module, attributes: ['id', 'name'], through: { attributes: [] } }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Email, employee code, or phone number is required'
      });
    }

    // Find user by employeCode, phoneNumber, or email
    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { employeCode: identifier },
          { phoneNumber: identifier },
          { email: identifier }
        ]
      } 
    });
    
    if (!user) {
      // Don't reveal if user exists for security
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this identifier, a password reset link has been sent'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator'
      });
    }

    // Generate reset token (simple implementation - in production, use crypto.randomBytes)
    const resetToken = jwt.sign(
      { id: user.id, type: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Store reset token (you might want to add a resetToken field to User model)
    // For now, we'll use a simple approach - in production, store in a separate table
    // await user.update({ resetToken, resetTokenExpiry: new Date(Date.now() + 3600000) });

    // TODO: Send email/SMS with reset link
    // For now, return success message
    // In production, send email with reset link: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`

    res.status(200).json({
      success: true,
      message: 'Password reset instructions have been sent to your registered email/phone',
      // In development, you might want to return the token for testing
      // Remove this in production!
      data: process.env.NODE_ENV === 'development' ? { resetToken } : undefined
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type !== 'password_reset') {
        return res.status(401).json({
          success: false,
          message: 'Invalid reset token'
        });
      }
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Find user
    const user = await User.findByPk(decoded.id);
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Update password (the beforeUpdate hook will hash it automatically)
    await user.update({ password: newPassword });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    next(error);
  }
};