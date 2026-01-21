import StockArea from '../models/StockArea.js';
import User from '../models/User.js';
// validationResult removed - using validate middleware in routes instead
import { Op } from 'sequelize';

/**
 * Get all stock areas
 * GET /api/inventory/stock-areas
 */
export const getAllStockAreas = async (req, res, next) => {
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

    // Build where clause
    const whereClause = req.withOrg ? req.withOrg({}) : {};

    if (!showInactive || showInactive === 'false') {
      whereClause.is_active = true;
    }

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { area_name: { [Op.like]: `%${search}%` } },
        { location_code: { [Op.like]: `%${search}%` } },
        { address: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { pin_code: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: stockAreas } = await StockArea.findAndCountAll({
      where: whereClause,
      limit: limitNumber,
      offset: offset,
      order: [['area_name', 'ASC']],
      distinct: true,
      include: [
        {
          model: User,
          as: 'storeKeeper',
          attributes: ['id', 'name', 'employeCode', 'email'],
          required: false
        }
      ]
    });

    const totalStockAreas = typeof count === 'number' ? count : 0;

    return res.status(200).json({
      success: true,
      data: {
        stockAreas,
        pagination: {
          currentPage: pageNumber,
          totalPages: limitNumber ? Math.max(Math.ceil(totalStockAreas / limitNumber), 1) : 1,
          totalItems: totalStockAreas,
          itemsPerPage: limitNumber
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single stock area by ID
 * GET /api/inventory/stock-areas/:id
 */
export const getStockAreaById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const stockArea = await StockArea.findOne({
      where: req.withOrg
        ? req.withOrg({
          area_id: id,
          is_active: true
        })
        : {
          area_id: id,
          is_active: true
        },
      include: [
        {
          model: User,
          as: 'storeKeeper',
          attributes: ['id', 'name', 'employeCode', 'email'],
          required: false
        }
      ]
    });

    if (!stockArea) {
      return res.status(404).json({
        success: false,
        message: 'Stock area not found',
        code: 'STOCK_AREA_NOT_FOUND'
      });
    }

    return res.status(200).json({
      success: true,
      data: { stockArea }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new stock area
 * POST /api/inventory/stock-areas
 */
export const createStockArea = async (req, res, next) => {
  try {
    // Validation is handled by validate middleware in route

    const { 
      areaName, 
      locationCode, 
      address, 
      capacity, 
      storeKeeperId, 
      description, 
      pinCode,
      companyName,
      streetNumberName,
      apartmentUnit,
      localityDistrict,
      city,
      stateProvince,
      country
    } = req.body;

    const stockArea = await StockArea.create({
      area_name: areaName,
      location_code: locationCode || null,
      address: address || null,
      capacity: capacity || null,
      store_keeper_id: storeKeeperId || null,
      description: description || null,
      pin_code: pinCode || null,
      company_name: companyName || null,
      street_number_name: streetNumberName || null,
      apartment_unit: apartmentUnit || null,
      locality_district: localityDistrict || null,
      city: city || null,
      state_province: stateProvince || null,
      country: country ? country.toUpperCase() : null,
      org_id: req.orgId || null,
      is_active: true
    });

    return res.status(201).json({
      success: true,
      message: 'Stock area created successfully',
      data: stockArea
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update stock area
 * PUT /api/inventory/stock-areas/:id
 */
export const updateStockArea = async (req, res, next) => {
  try {
    // Validation is handled by validate middleware in route

    const { id } = req.params;
    const { 
      areaName, 
      locationCode, 
      address, 
      capacity, 
      storeKeeperId, 
      description, 
      pinCode,
      companyName,
      streetNumberName,
      apartmentUnit,
      localityDistrict,
      city,
      stateProvince,
      country
    } = req.body;

    const stockArea = await StockArea.findOne({
      where: req.withOrg
        ? req.withOrg({
          area_id: id,
          is_active: true
        })
        : {
          area_id: id,
          is_active: true
        }
    });

    if (!stockArea) {
      return res.status(404).json({
        success: false,
        message: 'Stock area not found',
        code: 'STOCK_AREA_NOT_FOUND'
      });
    }

    await stockArea.update({
      area_name: areaName !== undefined ? areaName : stockArea.area_name,
      location_code: locationCode !== undefined ? locationCode : stockArea.location_code,
      address: address !== undefined ? address : stockArea.address,
      capacity: capacity !== undefined ? capacity : stockArea.capacity,
      store_keeper_id: storeKeeperId !== undefined ? storeKeeperId : stockArea.store_keeper_id,
      description: description !== undefined ? description : stockArea.description,
      pin_code: pinCode !== undefined ? pinCode : stockArea.pin_code,
      company_name: companyName !== undefined ? companyName : stockArea.company_name,
      street_number_name: streetNumberName !== undefined ? streetNumberName : stockArea.street_number_name,
      apartment_unit: apartmentUnit !== undefined ? apartmentUnit : stockArea.apartment_unit,
      locality_district: localityDistrict !== undefined ? localityDistrict : stockArea.locality_district,
      city: city !== undefined ? city : stockArea.city,
      state_province: stateProvince !== undefined ? stateProvince : stockArea.state_province,
      country: country !== undefined ? (country ? country.toUpperCase() : null) : stockArea.country,
    });

    return res.status(200).json({
      success: true,
      message: 'Stock area updated successfully',
      data: stockArea
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete stock area (soft delete)
 * DELETE /api/inventory/stock-areas/:id
 */
export const deleteStockArea = async (req, res, next) => {
  try {
    const { id } = req.params;

    const stockArea = await StockArea.findOne({
      where: req.withOrg
        ? req.withOrg({
          area_id: id,
          is_active: true
        })
        : {
          area_id: id,
          is_active: true
        }
    });

    if (!stockArea) {
      return res.status(404).json({
        success: false,
        message: 'Stock area not found',
        code: 'STOCK_AREA_NOT_FOUND'
      });
    }

    await stockArea.update({
      is_active: false
    });

    return res.status(200).json({
      success: true,
      message: 'Stock area deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};











