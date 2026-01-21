import Team from '../models/Team.js';
import Group from '../models/Group.js';
// validationResult removed - using validate middleware in routes instead
import { Op } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * Get all teams
 * GET /api/admin/teams
 */
export const getAllTeams = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      groupId = '',
      showInactive = false
    } = req.query;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.max(parseInt(limit, 10) || 50, 1);
    const offset = (pageNumber - 1) * limitNumber;

    const whereClause = req.withOrg ? req.withOrg({}) : {};

    if (!showInactive || showInactive === 'false') {
      whereClause.is_active = true;
    }

    if (groupId) {
      whereClause.group_id = groupId;
    }

    if (search) {
      whereClause[Op.or] = [
        { team_name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: teams } = await Team.findAndCountAll({
      where: whereClause,
      limit: limitNumber,
      offset: offset,
      order: [['team_name', 'ASC']],
      distinct: true,
      include: [
        {
          model: Group,
          as: 'group',
          attributes: ['group_id', 'group_name']
        }
      ]
    });

    const totalTeams = typeof count === 'number' ? count : 0;

    return res.status(200).json({
      success: true,
      data: {
        teams,
        pagination: {
          currentPage: pageNumber,
          totalPages: limitNumber ? Math.max(Math.ceil(totalTeams / limitNumber), 1) : 1,
          totalItems: totalTeams,
          itemsPerPage: limitNumber
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get teams by group ID
 * GET /api/admin/teams/group/:groupId
 */
export const getTeamsByGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const teams = await Team.findAll({
      where: req.withOrg
        ? req.withOrg({
          group_id: groupId,
          is_active: true
        })
        : {
          group_id: groupId,
          is_active: true
        },
      order: [['team_name', 'ASC']],
      include: [
        {
          model: Group,
          as: 'group',
          attributes: ['group_id', 'group_name']
        }
      ]
    });

    return res.status(200).json({
      success: true,
      data: { teams }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single team by ID
 * GET /api/admin/teams/:id
 */
export const getTeamById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const team = await Team.findOne({
      where: req.withOrg
        ? req.withOrg({
          team_id: id,
          is_active: true
        })
        : {
          team_id: id,
          is_active: true
        },
      include: [
        {
          model: Group,
          as: 'group',
          attributes: ['group_id', 'group_name']
        }
      ]
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: { team }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new team
 * POST /api/admin/teams
 */
export const createTeam = async (req, res, next) => {
  try {
    // Validation is handled by validate middleware in route

    const { teamName, groupId, description } = req.body;

    if (!teamName || !teamName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Team name is required',
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'teamName', message: 'Team name cannot be empty' }]
      });
    }

    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: 'Group ID is required',
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'groupId', message: 'Please select a group' }]
      });
    }

    // Validate group exists
    const group = await Group.findOne({
      where: req.withOrg
        ? req.withOrg({
            group_id: groupId,
            is_active: true
          })
        : {
            group_id: groupId,
            is_active: true
          }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
        code: 'GROUP_NOT_FOUND',
        errors: [{ field: 'groupId', message: 'The selected group does not exist' }]
      });
    }

    // Check for duplicate team name in the same group
    const existingTeam = await Team.findOne({
      where: req.withOrg
        ? req.withOrg({
            team_name: teamName.trim(),
            group_id: groupId,
            is_active: true
          })
        : {
            team_name: teamName.trim(),
            group_id: groupId,
            is_active: true
          }
    });

    if (existingTeam) {
      return res.status(409).json({
        success: false,
        message: 'Team with this name already exists in this group',
        code: 'UNIQUE_CONSTRAINT_ERROR',
        errors: [{ field: 'teamName', message: 'A team with this name already exists in the selected group' }]
      });
    }

    // Create team using raw SQL to avoid any Sequelize field mapping issues
    // This ensures we handle the group_id column type correctly (CHAR(36) vs INTEGER)
    // Generate UUID - compatible with all Node.js versions
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    const teamId = generateUUID();
    const trimmedName = teamName.trim();
    const trimmedDescription = description ? description.trim() : null;
    const orgId = req.orgId || null;

    // Check if group_id column is INTEGER (legacy schema) or CHAR(36)
    let groupIdColumnType = 'CHAR(36)';
    try {
      const [columnInfo] = await sequelize.query(`
        SELECT DATA_TYPE, COLUMN_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'teams'
        AND COLUMN_NAME = 'group_id'
      `, { type: sequelize.QueryTypes.SELECT });
      
      if (columnInfo && (columnInfo.DATA_TYPE === 'int' || columnInfo.DATA_TYPE === 'integer' || (columnInfo.COLUMN_TYPE && columnInfo.COLUMN_TYPE.includes('int')))) {
        // Legacy schema - group_id is INTEGER, but we're passing UUID
        // This shouldn't happen if migration ran, but handle it gracefully
        console.warn('⚠️  group_id column is INTEGER but UUID provided. Please run migration to fix schema.');
        throw new Error('Database schema mismatch: group_id is INTEGER but UUID provided. Please run migration script to fix.');
      }
    } catch (checkError) {
      if (checkError.message.includes('schema mismatch')) {
        throw checkError;
      }
      console.warn('Could not check group_id column type:', checkError.message);
    }

    // Check if 'name' column exists (legacy column)
    let nameColumnExists = false;
    try {
      const [nameCol] = await sequelize.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'teams'
        AND COLUMN_NAME = 'name'
      `, { type: sequelize.QueryTypes.SELECT });
      nameColumnExists = Array.isArray(nameCol) && nameCol.length > 0;
    } catch (checkError) {
      console.warn('Could not check for name column:', checkError.message);
    }

    // Insert using raw SQL to ensure correct data types
    // Include 'name' column if it exists (legacy schema compatibility)
    const insertColumns = nameColumnExists 
      ? '(\`team_id\`, \`name\`, \`team_name\`, \`group_id\`, \`description\`, \`org_id\`, \`is_active\`, \`created_at\`, \`updated_at\`)'
      : '(\`team_id\`, \`team_name\`, \`group_id\`, \`description\`, \`org_id\`, \`is_active\`, \`created_at\`, \`updated_at\`)';
    
    const insertValues = nameColumnExists
      ? '(:teamId, :teamName, :teamName, :groupId, :description, :orgId, TRUE, NOW(), NOW())'
      : '(:teamId, :teamName, :groupId, :description, :orgId, TRUE, NOW(), NOW())';

    await sequelize.query(`
      INSERT INTO \`teams\` ${insertColumns}
      VALUES ${insertValues}
    `, {
      replacements: {
        teamId,
        teamName: trimmedName,
        groupId: groupId,
        description: trimmedDescription,
        orgId
      },
      type: sequelize.QueryTypes.INSERT
    });

    // Fetch the created team using the model
    const team = await Team.findByPk(teamId);

    return res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: { team }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update team
 * PUT /api/admin/teams/:id
 */
export const updateTeam = async (req, res, next) => {
  try {
    // Validation is handled by validate middleware in route

    const { id } = req.params;
    const { teamName, groupId, description, isActive } = req.body;

    const team = await Team.findOne({
      where: req.withOrg
        ? req.withOrg({
          team_id: id,
          is_active: true
        })
        : {
          team_id: id,
          is_active: true
        }
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
        code: 'TEAM_NOT_FOUND'
      });
    }

    // Validate group if provided
    if (groupId && groupId !== team.group_id) {
      const group = await Group.findOne({
        where: req.withOrg
          ? req.withOrg({
            group_id: groupId,
            is_active: true
          })
          : {
            group_id: groupId,
            is_active: true
          }
      });

      if (!group) {
        return res.status(400).json({
          success: false,
          message: 'Group not found',
          code: 'GROUP_NOT_FOUND'
        });
      }
    }

    await team.update({
      team_name: teamName || team.team_name,
      group_id: groupId || team.group_id,
      description: description !== undefined ? description : team.description,
      is_active: isActive !== undefined ? isActive : team.is_active
    });

    return res.status(200).json({
      success: true,
      message: 'Team updated successfully',
      data: team
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete team (soft delete)
 * DELETE /api/admin/teams/:id
 */
export const deleteTeam = async (req, res, next) => {
  try {
    const { id } = req.params;

    const team = await Team.findOne({
      where: req.withOrg
        ? req.withOrg({
          team_id: id,
          is_active: true
        })
        : {
          team_id: id,
          is_active: true
        }
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
        code: 'TEAM_NOT_FOUND'
      });
    }

    await team.update({
      is_active: false
    });

    return res.status(200).json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

