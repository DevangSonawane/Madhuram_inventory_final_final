import SystemSettings from '../models/SystemSettings.js';
// validationResult removed - using validate middleware in routes instead

/**
 * Get all system settings
 * GET /api/v1/admin/settings
 */
export const getSettings = async (req, res, next) => {
  try {
    const settings = await SystemSettings.findAll({
      order: [['setting_key', 'ASC']],
    });

    // Transform to key-value object
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.setting_key] = setting.setting_value;
    });

    // Default settings structure
    const defaultSettings = {
      general: {
        systemName: 'Inventory Management System',
        companyName: '',
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY',
        itemsPerPage: 10,
      },
      notifications: {
        emailNotifications: true,
        lowStockAlerts: true,
        approvalNotifications: true,
        dailyReports: false,
      },
      security: {
        sessionTimeout: 30,
        passwordMinLength: 6,
        requireStrongPassword: false,
        twoFactorAuth: false,
      },
      inventory: {
        autoGenerateSlipNumber: true,
        allowNegativeStock: false,
        defaultStockArea: '',
        serialNumberFormat: 'AUTO',
      },
    };

    // Merge with stored settings
    const mergedSettings = {
      general: { ...defaultSettings.general, ...(settingsObj.general || {}) },
      notifications: { ...defaultSettings.notifications, ...(settingsObj.notifications || {}) },
      security: { ...defaultSettings.security, ...(settingsObj.security || {}) },
      inventory: { ...defaultSettings.inventory, ...(settingsObj.inventory || {}) },
    };

    return res.status(200).json({
      success: true,
      data: mergedSettings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update system settings
 * PUT /api/v1/admin/settings
 */
export const updateSettings = async (req, res, next) => {
  try {
    // Validation is handled by validate middleware in route

    const { general, notifications, security, inventory } = req.body;
    const userId = req.user?.id || req.user?.user_id;

    // Update each category
    const updateCategory = async (key, value) => {
      const [setting, created] = await SystemSettings.findOrCreate({
        where: { setting_key: key },
        defaults: {
          setting_key: key,
          setting_value: value,
          updated_by: userId,
        },
      });

      if (!created) {
        setting.setting_value = value;
        setting.updated_by = userId;
        await setting.save();
      }
    };

    if (general) await updateCategory('general', general);
    if (notifications) await updateCategory('notifications', notifications);
    if (security) await updateCategory('security', security);
    if (inventory) await updateCategory('inventory', inventory);

    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

