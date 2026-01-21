import User from '../models/User.js';
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';

export const createUser = async (req, res, next) => {
  try {
    const { name, email, employeCode, phoneNumber, password, role, isActive } = req.body;

    // Trim all string fields
    const trimmedData = {
      name: name?.trim(),
      email: email?.trim(),
      employeCode: employeCode?.trim() || null,
      phoneNumber: phoneNumber?.trim() || null,
      password,
      role: role?.trim() || 'user',
      isActive: isActive !== false
    };

    // Validate required fields
    if (!trimmedData.name || !trimmedData.email || !trimmedData.password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Validate max lengths
    if (trimmedData.name.length > 255) {
      return res.status(400).json({
        success: false,
        message: 'Name must not exceed 255 characters',
        code: 'VALIDATION_ERROR'
      });
    }
    if (trimmedData.email.length > 255) {
      return res.status(400).json({
        success: false,
        message: 'Email must not exceed 255 characters',
        code: 'VALIDATION_ERROR'
      });
    }
    if (trimmedData.employeCode && trimmedData.employeCode.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Employee code must not exceed 50 characters',
        code: 'VALIDATION_ERROR'
      });
    }
    if (trimmedData.phoneNumber && trimmedData.phoneNumber.length > 20) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must not exceed 20 characters',
        code: 'VALIDATION_ERROR'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      where: { 
        [Op.or]: [
          { email: trimmedData.email },
          ...(trimmedData.employeCode ? [{ employeCode: trimmedData.employeCode }] : []),
          ...(trimmedData.phoneNumber ? [{ phoneNumber: trimmedData.phoneNumber }] : [])
        ]
      } 
    });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email, employee code, or phone number already exists',
        code: 'DUPLICATE_USER'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(trimmedData.password, 10);

    // Create user
    const user = await User.create({
      name: trimmedData.name,
      email: trimmedData.email,
      employeCode: trimmedData.employeCode,
      phoneNumber: trimmedData.phoneNumber,
      password: hashedPassword,
      role: trimmedData.role,
      isActive: trimmedData.isActive,
    });

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = search
      ? {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } }
          ]
        }
      : {};

    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: {
        users: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, employeCode, phoneNumber, role, isActive } = req.body;
    const currentUser = req.user;

    // Check if user exists
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Authorization check: users can only update their own profile unless admin
    // Admin role_id is 2, check if current user is admin or updating themselves
    const isAdmin = currentUser.role_id === 2;
    const isUpdatingSelf = currentUser.id === parseInt(id);

    if (!isAdmin && !isUpdatingSelf) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this user',
        code: 'FORBIDDEN'
      });
    }

    // Trim all string fields
    const trimmedData = {};
    if (name !== undefined) {
      trimmedData.name = name?.trim();
      if (!trimmedData.name || trimmedData.name.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Name cannot be empty or only whitespace',
          code: 'VALIDATION_ERROR'
        });
      }
      if (trimmedData.name.length > 255) {
        return res.status(400).json({
          success: false,
          message: 'Name must not exceed 255 characters',
          code: 'VALIDATION_ERROR'
        });
      }
    }
    if (email !== undefined) {
      trimmedData.email = email?.trim();
      if (!trimmedData.email || trimmedData.email.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Email cannot be empty or only whitespace',
          code: 'VALIDATION_ERROR'
        });
      }
      if (trimmedData.email.length > 255) {
        return res.status(400).json({
          success: false,
          message: 'Email must not exceed 255 characters',
          code: 'VALIDATION_ERROR'
        });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedData.email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format',
          code: 'VALIDATION_ERROR'
        });
      }
    }
    if (employeCode !== undefined) {
      trimmedData.employeCode = employeCode?.trim() || null;
      if (trimmedData.employeCode && trimmedData.employeCode.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Employee code must not exceed 50 characters',
          code: 'VALIDATION_ERROR'
        });
      }
    }
    if (phoneNumber !== undefined) {
      trimmedData.phoneNumber = phoneNumber?.trim() || null;
      if (trimmedData.phoneNumber) {
        if (trimmedData.phoneNumber.length > 20) {
          return res.status(400).json({
            success: false,
            message: 'Phone number must not exceed 20 characters',
            code: 'VALIDATION_ERROR'
          });
        }
        if (!/^[0-9]{10,20}$/.test(trimmedData.phoneNumber)) {
          return res.status(400).json({
            success: false,
            message: 'Phone number must be 10-20 digits',
            code: 'VALIDATION_ERROR'
          });
        }
      }
    }
    if (role !== undefined) {
      trimmedData.role = role?.trim() || user.role;
    }
    if (isActive !== undefined) {
      trimmedData.isActive = isActive;
    }

    // Check for duplicate email, employeCode, or phoneNumber
    const whereConditions = [];
    if (trimmedData.email && trimmedData.email !== user.email) {
      whereConditions.push({ email: trimmedData.email });
    }
    if (trimmedData.employeCode && trimmedData.employeCode !== user.employeCode) {
      whereConditions.push({ employeCode: trimmedData.employeCode });
    }
    if (trimmedData.phoneNumber && trimmedData.phoneNumber !== user.phoneNumber) {
      whereConditions.push({ phoneNumber: trimmedData.phoneNumber });
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
          message: 'User with this email, employee code, or phone number already exists',
          code: 'DUPLICATE_USER'
        });
      }
    }

    await user.update(trimmedData);

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: userResponse
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.destroy();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};