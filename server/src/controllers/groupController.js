import Group from '../models/Group.js';
// validationResult removed - using validate middleware in routes instead
import { Op } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * Get all groups
 * GET /api/admin/groups
 */
export const getAllGroups = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      showInactive = false
    } = req.query;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.max(parseInt(limit, 10) || 50, 1);
    const offset = (pageNumber - 1) * limitNumber;

    const whereClause = req.withOrg ? req.withOrg({}) : {};

    if (!showInactive || showInactive === 'false') {
      whereClause.is_active = true;
    }

    if (search) {
      whereClause[Op.or] = [
        { group_name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: groups } = await Group.findAndCountAll({
      where: whereClause,
      limit: limitNumber,
      offset: offset,
      order: [['group_name', 'ASC']],
      distinct: true,
    });

    const totalGroups = typeof count === 'number' ? count : 0;

    return res.status(200).json({
      success: true,
      data: {
        groups,
        pagination: {
          currentPage: pageNumber,
          totalPages: limitNumber ? Math.max(Math.ceil(totalGroups / limitNumber), 1) : 1,
          totalItems: totalGroups,
          itemsPerPage: limitNumber
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single group by ID
 * GET /api/admin/groups/:id
 */
export const getGroupById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const group = await Group.findOne({
      where: req.withOrg
        ? req.withOrg({
          group_id: id,
          is_active: true
        })
        : {
          group_id: id,
          is_active: true
        }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
        code: 'GROUP_NOT_FOUND'
      });
    }

    return res.status(200).json({
      success: true,
      data: { group }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new group
 * POST /api/admin/groups
 */
export const createGroup = async (req, res, next) => {
  try {
    // Validation is handled by validate middleware in route

    const { groupName, description } = req.body;

    if (!groupName || !groupName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Group name is required',
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'groupName', message: 'Group name cannot be empty' }]
      });
    }

    // Check for duplicate group name
    const existingGroup = await Group.findOne({
      where: req.withOrg
        ? req.withOrg({
            group_name: groupName.trim(),
            is_active: true
          })
        : {
            group_name: groupName.trim(),
            is_active: true
          }
    });

    if (existingGroup) {
      return res.status(409).json({
        success: false,
        message: 'Group with this name already exists',
        code: 'UNIQUE_CONSTRAINT_ERROR',
        errors: [{ field: 'groupName', message: 'A group with this name already exists' }]
      });
    }

    // Create group using raw SQL to avoid any Sequelize field mapping issues
    // This ensures we only insert into columns that actually exist in the database
    // Generate UUID - compatible with all Node.js versions
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    const groupId = generateUUID();
    const trimmedName = groupName.trim();
    const trimmedDescription = description ? description.trim() : null;
    const orgId = req.orgId || null;

    // Check if 'name' column exists in the database (legacy column)
    // If it does, we need to include it in the INSERT to avoid "Field 'name' doesn't have a default value" error
    let nameColumnExists = false;
    try {
      const [columns] = await sequelize.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'groups'
        AND COLUMN_NAME = 'name'
      `, { type: sequelize.QueryTypes.SELECT });
      nameColumnExists = Array.isArray(columns) && columns.length > 0;
    } catch (checkError) {
      console.warn('Could not check for name column:', checkError.message);
    }

    // Insert using raw SQL - include 'name' column if it exists to avoid errors
    if (nameColumnExists) {
      // Include 'name' column for legacy database schemas
      await sequelize.query(`
        INSERT INTO \`groups\` (\`group_id\`, \`name\`, \`group_name\`, \`description\`, \`org_id\`, \`is_active\`, \`created_at\`, \`updated_at\`)
        VALUES (:groupId, :groupName, :groupName, :description, :orgId, TRUE, NOW(), NOW())
      `, {
        replacements: {
          groupId,
          groupName: trimmedName,
          description: trimmedDescription,
          orgId
        },
        type: sequelize.QueryTypes.INSERT
      });
    } else {
      // Standard insert without 'name' column
      await sequelize.query(`
        INSERT INTO \`groups\` (\`group_id\`, \`group_name\`, \`description\`, \`org_id\`, \`is_active\`, \`created_at\`, \`updated_at\`)
        VALUES (:groupId, :groupName, :description, :orgId, TRUE, NOW(), NOW())
      `, {
        replacements: {
          groupId,
          groupName: trimmedName,
          description: trimmedDescription,
          orgId
        },
        type: sequelize.QueryTypes.INSERT
      });
    }

    // Fetch the created group using the model
    const group = await Group.findByPk(groupId);

    return res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: { group }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update group
 * PUT /api/admin/groups/:id
 */
export const updateGroup = async (req, res, next) => {
  try {
    // Validation is handled by validate middleware in route

    const { id } = req.params;
    const { groupName, description, isActive } = req.body;

    const group = await Group.findOne({
      where: req.withOrg
        ? req.withOrg({
          group_id: id
        })
        : {
          group_id: id
        }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
        code: 'GROUP_NOT_FOUND',
        errors: [{ field: 'id', message: 'Group with this ID does not exist' }]
      });
    }

    // Check for duplicate name if name is being changed
    if (groupName && groupName.trim() !== group.group_name) {
      const existingGroup = await Group.findOne({
        where: req.withOrg
          ? req.withOrg({
              group_name: groupName.trim(),
              is_active: true
            })
          : {
              group_name: groupName.trim(),
              is_active: true
            }
      });

      if (existingGroup && existingGroup.group_id !== id) {
        return res.status(409).json({
          success: false,
          message: 'Group with this name already exists',
          code: 'UNIQUE_CONSTRAINT_ERROR',
          errors: [{ field: 'groupName', message: 'A group with this name already exists' }]
        });
      }
    }

    await group.update({
      group_name: groupName ? groupName.trim() : group.group_name,
      description: description !== undefined ? (description ? description.trim() : null) : group.description,
      is_active: isActive !== undefined ? isActive : group.is_active
    });

    return res.status(200).json({
      success: true,
      message: 'Group updated successfully',
      data: { group }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete group (soft delete)
 * DELETE /api/admin/groups/:id
 */
export const deleteGroup = async (req, res, next) => {
  try {
    const { id } = req.params;

    const group = await Group.findOne({
      where: req.withOrg
        ? req.withOrg({
          group_id: id,
          is_active: true
        })
        : {
          group_id: id,
          is_active: true
        }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
        code: 'GROUP_NOT_FOUND'
      });
    }

    await group.update({
      is_active: false
    });

    return res.status(200).json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

