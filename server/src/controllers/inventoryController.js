import Asset from '../models/Asset.js';
import Company from '../models/Company.js';
import AssetType from '../models/AssetType.js';
// validationResult removed - using validate middleware in routes instead
import { Op, fn, col, where, literal } from 'sequelize';

// ==================== ASSET OPERATIONS ====================

/**
 * Add new stock to an asset (creates new asset or updates existing)
 * POST /api/inventory/add-stock
 */
export const addStock = async (req, res, next) => {
  try {
    // Validation is handled by validate middleware in route

    const { company, assetType, batchQty, threshold, orgId } = req.body;
    const userId = req.user?.user_id; // Assuming user is attached via auth middleware

    // Check if asset already exists for this company and asset type
    const existingAsset = await Asset.findOne({
      where: {
        asset_type: assetType,
        company: company,
        org_id: orgId || null,
        is_active: true
      }
    });

    if (existingAsset) {
      // Update existing asset - add to total_in and recalculate balance
      const newTotalIn = existingAsset.total_in + parseInt(batchQty);
      const newBalance = newTotalIn - existingAsset.total_out;

      await existingAsset.update({
        total_in: newTotalIn,
        balance: newBalance,
        threshold: threshold || existingAsset.threshold,
        updated_by: userId
      });

      return res.status(200).json({
        success: true,
        message: 'Stock added successfully to existing asset',
        data: existingAsset
      });
    } else {
      // Create new asset
      const newAsset = await Asset.create({
        asset_type: assetType,
        company: company,
        total_in: parseInt(batchQty),
        total_out: 0,
        balance: parseInt(batchQty),
        threshold: threshold || 10,
        org_id: orgId || null,
        created_by: userId,
        is_active: true
      });

      return res.status(201).json({
        success: true,
        message: 'New asset created and stock added successfully',
        data: newAsset
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get all assets with filtering, searching, and pagination
 * GET /api/inventory/assets
 */
export const getAllAssets = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      assetType = '',
      company = '',
      orgId = '',
      showInactive = false
    } = req.query;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.max(parseInt(limit, 10) || 50, 1);
    const offset = (pageNumber - 1) * limitNumber;

    // Build where clause
    const whereClause = {};

    if (orgId) {
      whereClause.org_id = orgId;
    }

    if (!showInactive || showInactive === 'false') {
      whereClause.is_active = true;
    }

    // Search filter - searches in asset_type and company
    if (search) {
      whereClause[Op.or] = [
        { asset_type: { [Op.like]: `%${search}%` } },
        { company: { [Op.like]: `%${search}%` } }
      ];
    }

    // Asset type filter
    if (assetType && assetType !== 'All Assets' && assetType !== '') {
      whereClause.asset_type = assetType;
    }

    // Company filter
    if (company && company !== 'All Companies' && company !== '') {
      whereClause.company = company;
    }

    const { count, rows: assets } = await Asset.findAndCountAll({
      where: whereClause,
      limit: limitNumber,
      offset: offset,
      order: [['created_at', 'DESC']],
      distinct: true,
    });

    const totalAssets =
      typeof count === 'number'
        ? count
        : Array.isArray(count)
        ? count.reduce((sum, entry) => sum + Number(entry?.count || 0), 0)
        : 0;

    const baseAndConditions = whereClause[Op.and]
      ? Array.isArray(whereClause[Op.and])
        ? [...whereClause[Op.and]]
        : [whereClause[Op.and]]
      : [];

    const lowStockWhere = {
      ...whereClause,
      [Op.and]: [
        ...baseAndConditions,
        where(col('balance'), Op.lte, col('threshold')),
      ],
    };

    const [aggregates = {}, lowStockCount = 0, assetsByTypeRaw = [], assetsByCompanyRaw = []] =
      await Promise.all([
        Asset.findOne({
          attributes: [
            [fn('SUM', col('balance')), 'totalBalance'],
            [fn('SUM', col('total_in')), 'totalIn'],
            [fn('SUM', col('total_out')), 'totalOut'],
          ],
          where: whereClause,
          raw: true,
        }),
        Asset.count({
          where: lowStockWhere,
        }),
        Asset.findAll({
          attributes: [
            'asset_type',
            [fn('SUM', col('total_in')), 'totalIn'],
            [fn('SUM', col('total_out')), 'totalOut'],
            [fn('SUM', col('balance')), 'balance'],
            [fn('COUNT', col('asset_id')), 'count'],
            [fn('MIN', literal('balance - threshold')), 'minDifference'],
          ],
          where: whereClause,
          group: ['asset_type'],
          raw: true,
        }),
        Asset.findAll({
          attributes: [
            'company',
            [fn('SUM', col('total_in')), 'totalIn'],
            [fn('SUM', col('total_out')), 'totalOut'],
            [fn('SUM', col('balance')), 'balance'],
            [fn('COUNT', col('asset_id')), 'count'],
          ],
          where: whereClause,
          group: ['company'],
          raw: true,
        }),
      ]);

    const summary = {
      totalAssets,
      lowStockCount,
      healthyStockCount: Math.max(totalAssets - lowStockCount, 0),
      totalInventoryValue: Number(aggregates?.totalBalance) || 0,
      totalIn: Number(aggregates?.totalIn) || 0,
      totalOut: Number(aggregates?.totalOut) || 0,
    };

    const assetsByType = assetsByTypeRaw.map(type => ({
      assetType: type.asset_type,
      totalIn: Number(type.totalIn) || 0,
      totalOut: Number(type.totalOut) || 0,
      balance: Number(type.balance) || 0,
      count: Number(type.count) || 0,
      status: Number(type.minDifference) <= 0 ? 'Low stock' : 'Healthy',
    }));

    const assetsByCompany = assetsByCompanyRaw.map(companyRecord => ({
      company: companyRecord.company,
      totalIn: Number(companyRecord.totalIn) || 0,
      totalOut: Number(companyRecord.totalOut) || 0,
      balance: Number(companyRecord.balance) || 0,
      count: Number(companyRecord.count) || 0,
    }));

    return res.status(200).json({
      success: true,
      data: {
        assets,
        assetsByType,
        assetsByCompany,
        summary,
        pagination: {
          currentPage: pageNumber,
          totalPages: limitNumber ? Math.max(Math.ceil(totalAssets / limitNumber), 1) : 1,
          totalItems: totalAssets,
          itemsPerPage: limitNumber
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single asset by ID
 * GET /api/inventory/assets/:id
 */
export const getAssetById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const asset = await Asset.findOne({
      where: {
        asset_id: id,
        is_active: true
      }
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found',
        code: 'ASSET_NOT_FOUND'
      });
    }

    return res.status(200).json({
      success: true,
      data: asset
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update asset (edit asset details, adjust stock out, update threshold)
 * PUT /api/inventory/assets/:id
 */
export const updateAsset = async (req, res, next) => {
  try {
    // Validation is handled by validate middleware in route

    const { id } = req.params;
    const { assetType, company, totalIn, totalOut, threshold, addToOut } = req.body;
    const userId = req.user?.user_id;

    const asset = await Asset.findOne({
      where: {
        asset_id: id,
        is_active: true
      }
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found',
        code: 'ASSET_NOT_FOUND'
      });
    }

    // Prepare update object
    const updateData = {
      updated_by: userId
    };

    // Update fields if provided
    if (assetType !== undefined) updateData.asset_type = assetType;
    if (company !== undefined) updateData.company = company;
    if (threshold !== undefined) updateData.threshold = parseInt(threshold);

    // Handle total_in and total_out updates
    if (totalIn !== undefined) {
      updateData.total_in = parseInt(totalIn);
    }
    
    if (totalOut !== undefined) {
      updateData.total_out = parseInt(totalOut);
    } else if (addToOut !== undefined) {
      // Add to existing total_out
      updateData.total_out = asset.total_out + parseInt(addToOut);
    }

    // Recalculate balance
    const finalTotalIn = updateData.total_in !== undefined ? updateData.total_in : asset.total_in;
    const finalTotalOut = updateData.total_out !== undefined ? updateData.total_out : asset.total_out;
    updateData.balance = finalTotalIn - finalTotalOut;

    // Validate balance is not negative
    if (updateData.balance < 0) {
      return res.status(400).json({
        success: false,
        message: 'Total out cannot exceed total in. Balance would be negative.',
        code: 'VALIDATION_ERROR'
      });
    }

    await asset.update(updateData);

    return res.status(200).json({
      success: true,
      message: 'Asset updated successfully',
      data: asset
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete asset (soft delete)
 * DELETE /api/inventory/assets/:id
 */
export const deleteAsset = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.user_id;

    const asset = await Asset.findOne({
      where: {
        asset_id: id,
        is_active: true
      }
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found',
        code: 'ASSET_NOT_FOUND'
      });
    }

    await asset.update({
      is_active: false,
      updated_by: userId
    });

    return res.status(200).json({
      success: true,
      message: 'Asset deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get assets with low stock (balance <= threshold)
 * GET /api/inventory/low-stock
 */
export const getLowStockAssets = async (req, res, next) => {
  try {
    const { orgId = '' } = req.query;

    const whereClause = {
      is_active: true,
      [Op.and]: [
        { balance: { [Op.lte]: { [Op.col]: 'threshold' } } }
      ]
    };

    if (orgId) {
      whereClause.org_id = orgId;
    }

    const lowStockAssets = await Asset.findAll({
      where: whereClause,
      order: [['balance', 'ASC']],
    });

    return res.status(200).json({
      success: true,
      data: lowStockAssets,
      count: lowStockAssets.length
    });
  } catch (error) {
    next(error);
  }
};

// ==================== COMPANY OPERATIONS ====================

/**
 * Get all companies
 * GET /api/inventory/companies
 */
export const getAllCompanies = async (req, res, next) => {
  try {
    const { orgId = '' } = req.query;

    const whereClause = { is_active: true };
    if (orgId) {
      whereClause.org_id = orgId;
    }

    const companies = await Company.findAll({
      where: whereClause,
      order: [['company_code', 'ASC']],
    });

    return res.status(200).json({
      success: true,
      data: companies
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add new company
 * POST /api/inventory/companies
 */
export const addCompany = async (req, res, next) => {
  try {
    // Validation is handled by validate middleware in route

    const { companyCode, companyName, orgId } = req.body;

    // Check if company already exists
    const existingCompany = await Company.findOne({
      where: {
        company_code: companyCode,
        org_id: orgId || null
      }
    });

    if (existingCompany) {
      return res.status(409).json({
        success: false,
        message: 'Company with this code already exists',
        code: 'UNIQUE_CONSTRAINT_ERROR'
      });
    }

    const company = await Company.create({
      company_code: companyCode,
      company_name: companyName,
      org_id: orgId || null,
      is_active: true
    });

    return res.status(201).json({
      success: true,
      message: 'Company added successfully',
      data: company
    });
  } catch (error) {
    next(error);
  }
};

// ==================== ASSET TYPE OPERATIONS ====================

/**
 * Get all asset types
 * GET /api/inventory/asset-types
 */
export const getAllAssetTypes = async (req, res, next) => {
  try {
    const { orgId = '' } = req.query;

    const whereClause = { is_active: true };
    if (orgId) {
      whereClause.org_id = orgId;
    }

    const assetTypes = await AssetType.findAll({
      where: whereClause,
      order: [['type_name', 'ASC']],
    });

    return res.status(200).json({
      success: true,
      data: assetTypes
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add new asset type
 * POST /api/inventory/asset-types
 */
export const addAssetType = async (req, res, next) => {
  try {
    // Validation is handled by validate middleware in route

    const { typeName, typeCode, description, orgId } = req.body;

    // Check if asset type already exists
    const existingType = await AssetType.findOne({
      where: {
        type_code: typeCode,
        org_id: orgId || null
      }
    });

    if (existingType) {
      return res.status(409).json({
        success: false,
        message: 'Asset type with this code already exists',
        code: 'UNIQUE_CONSTRAINT_ERROR'
      });
    }

    const assetType = await AssetType.create({
      type_name: typeName,
      type_code: typeCode,
      description: description || null,
      org_id: orgId || null,
      is_active: true
    });

    return res.status(201).json({
      success: true,
      message: 'Asset type added successfully',
      data: assetType
    });
  } catch (error) {
    next(error);
  }
};

// ==================== DASHBOARD/ANALYTICS ====================

/**
 * Get inventory dashboard statistics
 * GET /api/inventory/dashboard
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const { orgId = '' } = req.query;

    const whereClause = { is_active: true };
    if (orgId) {
      whereClause.org_id = orgId;
    }

    const allAssets = await Asset.findAll({
      where: whereClause,
    });

    // Calculate statistics
    const totalAssets = allAssets.length;
    const lowStockAssets = allAssets.filter(asset => asset.balance <= asset.threshold);
    const totalInventoryValue = allAssets.reduce((sum, asset) => sum + asset.balance, 0);
    const totalIn = allAssets.reduce((sum, asset) => sum + asset.total_in, 0);
    const totalOut = allAssets.reduce((sum, asset) => sum + asset.total_out, 0);

    // Group by asset type
    const assetsByType = {};
    allAssets.forEach(asset => {
      if (!assetsByType[asset.asset_type]) {
        assetsByType[asset.asset_type] = {
          assetType: asset.asset_type,
          totalIn: 0,
          totalOut: 0,
          balance: 0,
          count: 0,
          status: 'Healthy'
        };
      }
      assetsByType[asset.asset_type].totalIn += asset.total_in;
      assetsByType[asset.asset_type].totalOut += asset.total_out;
      assetsByType[asset.asset_type].balance += asset.balance;
      assetsByType[asset.asset_type].count += 1;
      
      if (asset.balance <= asset.threshold) {
        assetsByType[asset.asset_type].status = 'Low stock';
      }
    });

    // Group by company
    const assetsByCompany = {};
    allAssets.forEach(asset => {
      if (!assetsByCompany[asset.company]) {
        assetsByCompany[asset.company] = {
          company: asset.company,
          totalIn: 0,
          totalOut: 0,
          balance: 0,
          count: 0
        };
      }
      assetsByCompany[asset.company].totalIn += asset.total_in;
      assetsByCompany[asset.company].totalOut += asset.total_out;
      assetsByCompany[asset.company].balance += asset.balance;
      assetsByCompany[asset.company].count += 1;
    });

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalAssets,
          lowStockCount: lowStockAssets.length,
          healthyStockCount: totalAssets - lowStockAssets.length,
          totalInventoryValue,
          totalIn,
          totalOut
        },
        assetsByType: Object.values(assetsByType),
        assetsByCompany: Object.values(assetsByCompany),
        lowStockAlerts: lowStockAssets.map(asset => ({
          asset_id: asset.asset_id,
          asset_type: asset.asset_type,
          company: asset.company,
          balance: asset.balance,
          threshold: asset.threshold,
          shortage: asset.threshold - asset.balance
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

