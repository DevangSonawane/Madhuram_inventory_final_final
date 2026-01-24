import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    }, 
    process.env.JWT_SECRET || 'default_secret', 
    { expiresIn: '24h' }
  );
};

// 1. Signup
export const signup = async (req, res) => {
  try {
    const { name, username, email, phone_number, role, project, password } = req.body;

    // Validation
    if (!name || !username || !email || !phone_number || !password || !role) {
      return res.status(400).json({ message: 'username, email, phone_number, password, and role are required' });
    }

    const validRoles = ['admin', 'operational_manager', 'po_officer', 'labour'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'invalid role' });
    }

    // Check duplicates
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) return res.status(409).json({ message: 'email already exists' });

    const existingPhone = await User.findOne({ where: { phone_number } });
    if (existingPhone) return res.status(409).json({ message: 'phone number already exists' });

    // Create User
    const user = await User.create({
      name,
      username,
      email,
      phone_number,
      role,
      project_list: project || [],
      password
    });

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        user_id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role,
        project_list: user.project_list
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'failed to sign up' });
  }
};

// 2. Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'invalid credentials' });
    }

    const isMatch = await user.isValidPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'password does not match' });
    }

    const token = generateToken(user);

    res.status(200).json({
      token,
      user: {
        user_id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role,
        project_list: user.project_list
      },
      message: 'login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'failed to log in' });
  }
};

// 3. Logout
export const logout = async (req, res) => {
  res.status(200).json({ message: 'logged out successfully' });
};

// 4. Forgot Password
export const forgotPassword = async (req, res) => {
  try {
    const { email_id, password_change, re_typepassword } = req.body;

    if (!email_id || !password_change || !re_typepassword) {
      return res.status(400).json({ message: 'email_id, password_change, and re_typepassword are required' });
    }

    if (password_change !== re_typepassword) {
      return res.status(400).json({ message: 'password does not match' });
    }

    const user = await User.findOne({ where: { email: email_id } });
    if (!user) {
      return res.status(401).json({ message: 'email not found' });
    }

    user.password = password_change;
    await user.save();

    res.status(200).json({ message: 'password updated successfully' });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'failed to update password' });
  }
};

// 5. Get All Users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    const formattedUsers = users.map(user => ({
      user_id: user.id,
      name: user.name,
      email: user.email,
      phone_number: user.phone_number,
      role: user.role,
      project_list: user.project_list
    }));

    res.status(200).json(formattedUsers);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'failed to fetch users' });
  }
};

// 6. Update User
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, phone_number, role, project_list } = req.body;

    if (!username || !email || !role) {
      return res.status(400).json({ message: 'username, email and role are required' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'user not found' });
    }

    user.name = username; // Map username in body to name in DB as per doc implication
    user.username = username; // Also update username field
    user.email = email;
    user.phone_number = phone_number;
    user.role = role;
    if (project_list) user.project_list = project_list;

    await user.save();

    res.status(200).json({
      user_id: user.id,
      name: user.name,
      email: user.email,
      phone_number: user.phone_number,
      role: user.role,
      project_list: user.project_list
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'failed to update user' });
  }
};

// 7. Delete User
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ message: 'user not found' });
    }

    await user.destroy();
    res.status(200).json({ message: 'user deleted successfully' });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'failed to delete user' });
  }
};
