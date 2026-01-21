import MaterialType from '../models/MaterialType.js';

/**
 * Get all valid material type names from the database
 * @param {Object} options - Options for filtering (orgId, etc.)
 * @returns {Promise<string[]>} Array of valid material type names
 */
export const getValidMaterialTypes = async (options = {}) => {
  try {
    const whereClause = { is_active: true };
    
    // Support org context if provided
    if (options.withOrg) {
      Object.assign(whereClause, options.withOrg({}));
    } else if (options.orgId !== undefined) {
      whereClause.org_id = options.orgId || null;
    }

    const materialTypes = await MaterialType.findAll({
      where: whereClause,
      attributes: ['type_name'],
      order: [['type_name', 'ASC']],
    });

    return materialTypes.map(mt => mt.type_name);
  } catch (error) {
    console.error('Error fetching material types:', error);
    // Return empty array on error - validation will fail but won't crash
    return [];
  }
};

/**
 * Validate if a material type is valid
 * @param {string} materialType - Material type to validate
 * @param {Object} options - Options for filtering (orgId, etc.)
 * @returns {Promise<boolean>} True if valid, false otherwise
 */
export const isValidMaterialType = async (materialType, options = {}) => {
  if (!materialType || typeof materialType !== 'string' || materialType.trim() === '') {
    return false;
  }

  const trimmedType = materialType.trim();
  const validTypes = await getValidMaterialTypes(options);
  
  // If no material types exist in DB, allow any non-empty string (for backward compatibility)
  if (validTypes.length === 0) {
    return trimmedType.length > 0;
  }
  
  // Case-insensitive comparison
  return validTypes.some(validType => validType.toLowerCase() === trimmedType.toLowerCase());
};

/**
 * Express validator custom function for material type validation
 * This can be used in route validation
 */
export const validateMaterialType = (options = {}) => {
  return async (value, { req }) => {
    // Treat empty strings as missing
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      throw new Error('Material type is required');
    }

    const trimmedValue = typeof value === 'string' ? value.trim() : value;
    
    // Build options with org context from request
    const validationOptions = {
      ...options,
      orgId: req.orgId || options.orgId,
      withOrg: req.withOrg || options.withOrg,
    };

    const validTypes = await getValidMaterialTypes(validationOptions);
    
    if (validTypes.length === 0) {
      // If no material types found, allow any non-empty string (for flexibility)
      // This handles cases where material types haven't been set up yet
      return true;
    }

    // Case-insensitive comparison
    const isValid = validTypes.some(validType => validType.toLowerCase() === trimmedValue.toLowerCase());
    if (!isValid) {
      const typesList = validTypes.join(', ');
      throw new Error(`Material type must be one of: ${typesList}`);
    }

    return true;
  };
};

