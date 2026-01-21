import User from '../models/User.js';

/**
 * Get user preferences
 */
export const getPreferences = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.user_id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Get preferences from user's metadata or return defaults
    let preferences = {
      theme: 'light',
      language: 'english',
      dateFormat: 'DD/MM/YYYY',
      itemsPerPage: 10,
    };

    // Parse preferences if stored as JSON string
    if (user.preferences) {
      try {
        const parsed = typeof user.preferences === 'string' 
          ? JSON.parse(user.preferences) 
          : user.preferences;
        preferences = { ...preferences, ...parsed };
      } catch (error) {
        console.error('Error parsing preferences:', error);
      }
    }

    res.status(200).json({
      success: true,
      data: preferences
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user preferences
 */
export const updatePreferences = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.user_id;
    const { theme, language, dateFormat, itemsPerPage } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Build preferences object
    const currentPreferences = user.preferences || {};
    const updatedPreferences = {
      theme: theme !== undefined ? theme : (currentPreferences.theme || 'light'),
      language: language !== undefined ? language : (currentPreferences.language || 'english'),
      dateFormat: dateFormat !== undefined ? dateFormat : (currentPreferences.dateFormat || 'DD/MM/YYYY'),
      itemsPerPage: itemsPerPage !== undefined ? parseInt(itemsPerPage) : (currentPreferences.itemsPerPage || 10),
    };

    // Update user preferences
    // Store as JSON string in a text field or use a JSON column if available
    // For now, we'll use a simple approach - you may need to add a preferences column to users table
    // This is a simplified version - in production, add a preferences JSON column to users table
    await user.update({
      preferences: JSON.stringify(updatedPreferences)
    });

    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      data: preferences
    });
  } catch (error) {
    next(error);
  }
};

