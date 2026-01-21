import BusinessPartner from '../models/BusinessPartner.js';
// validationResult removed - using validate middleware in routes instead
import { Op } from 'sequelize';

/**
 * Get all business partners with filtering and pagination
 * GET /api/inventory/business-partners
 */
export const getAllBusinessPartners = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      partnerType = ''
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = req.withOrg ? req.withOrg({ is_active: true }) : { is_active: true };

    if (partnerType) {
      where.partner_type = partnerType;
    }

    if (search) {
      where[Op.or] = [
        { partner_name: { [Op.like]: `%${search}%` } },
        { contact_person: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await BusinessPartner.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['partner_name', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: {
        businessPartners: rows,
        pagination: {
          totalItems: count,
          totalPages: Math.ceil(count / parseInt(limit)),
          currentPage: parseInt(page),
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single business partner by ID
 * GET /api/inventory/business-partners/:id
 */
export const getBusinessPartnerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const businessPartner = await BusinessPartner.findOne({
      where: req.withOrg
        ? req.withOrg({ partner_id: id, is_active: true })
        : { partner_id: id, is_active: true }
    });

    if (!businessPartner) {
      return res.status(404).json({
        success: false,
        message: 'Business partner not found',
        code: 'BUSINESS_PARTNER_NOT_FOUND'
      });
    }

    return res.status(200).json({
      success: true,
      data: { businessPartner }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new business partner
 * POST /api/inventory/business-partners
 */
export const createBusinessPartner = async (req, res, next) => {
  try {
    // Validation is handled by validate middleware in route

    const {
      partnerName,
      partnerType,
      gstNumber,
      panCard,
      tanNumber,
      billingAddress,
      shippingAddress,
      sameAsBilling,
      bankName,
      bankAccountName,
      ifscCode,
      accountNumber,
      contactFirstName,
      contactLastName,
      contactDesignation,
      contactPhone,
      contactEmail,
      country,
      state,
      companyWebsite,
      vendorCode,
      // Legacy fields
      contactPerson,
      email,
      phone,
      address,
      orgId
    } = req.body;

    // Auto-generate vendor code if not provided
    let finalVendorCode = vendorCode;
    if (!finalVendorCode) {
      const prefix = partnerType === 'SUPPLIER' ? 'SUP' : partnerType === 'FRANCHISE' ? 'FRN' : 'BTH';
      const timestamp = Date.now().toString().slice(-6);
      finalVendorCode = `${prefix}-${timestamp}`;
      
      // Ensure uniqueness
      let counter = 1;
      while (await BusinessPartner.findOne({ where: { vendor_code: finalVendorCode } })) {
        finalVendorCode = `${prefix}-${timestamp}-${counter}`;
        counter++;
      }
    }

    const businessPartner = await BusinessPartner.create({
      partner_name: partnerName,
      partner_type: partnerType || 'SUPPLIER',
      gst_number: gstNumber ? gstNumber.replace(/\s/g, '').toUpperCase() : null,
      pan_card: panCard ? panCard.replace(/\s/g, '').toUpperCase() : null,
      tan_number: tanNumber ? tanNumber.replace(/\s/g, '').toUpperCase() : null,
      billing_address: billingAddress,
      shipping_address: sameAsBilling ? billingAddress : shippingAddress,
      same_as_billing: sameAsBilling || false,
      bank_name: bankName,
      bank_account_name: bankAccountName,
      ifsc_code: ifscCode ? ifscCode.replace(/\s/g, '').toUpperCase() : null,
      account_number: accountNumber,
      contact_first_name: contactFirstName,
      contact_last_name: contactLastName,
      contact_designation: contactDesignation,
      contact_phone: contactPhone ? contactPhone.replace(/\D/g, '') : null,
      contact_email: contactEmail ? contactEmail.toLowerCase().trim() : null,
      country: country || null,
      state: state || null,
      company_website: companyWebsite || null,
      vendor_code: finalVendorCode,
      // Legacy fields for backward compatibility
      contact_person: contactPerson || `${contactFirstName} ${contactLastName}`.trim(),
      email: email || contactEmail || null,
      phone: phone ? phone.replace(/\D/g, '') : (contactPhone ? contactPhone.replace(/\D/g, '') : null),
      address: address || billingAddress || null,
      org_id: req.orgId || orgId || null,
      is_active: true
    });

    return res.status(201).json({
      success: true,
      message: 'Business partner created successfully',
      data: { businessPartner }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update business partner
 * PUT /api/inventory/business-partners/:id
 */
export const updateBusinessPartner = async (req, res, next) => {
  try {
    // Validation is handled by validate middleware in route

    const { id } = req.params;
    const {
      partnerName,
      partnerType,
      gstNumber,
      panCard,
      tanNumber,
      billingAddress,
      shippingAddress,
      sameAsBilling,
      bankName,
      bankAccountName,
      ifscCode,
      accountNumber,
      contactFirstName,
      contactLastName,
      contactDesignation,
      contactPhone,
      contactEmail,
      country,
      state,
      companyWebsite,
      vendorCode,
      // Legacy fields
      contactPerson,
      email,
      phone,
      address
    } = req.body;

    const businessPartner = await BusinessPartner.findOne({
      where: req.withOrg
        ? req.withOrg({ partner_id: id, is_active: true })
        : { partner_id: id, is_active: true }
    });

    if (!businessPartner) {
      return res.status(404).json({
        success: false,
        message: 'Business partner not found',
        code: 'BUSINESS_PARTNER_NOT_FOUND'
      });
    }

    // Handle vendor code uniqueness if being updated
    let finalVendorCode = vendorCode !== undefined ? vendorCode : businessPartner.vendor_code;
    if (vendorCode && vendorCode !== businessPartner.vendor_code) {
      const existing = await BusinessPartner.findOne({ 
        where: { vendor_code: vendorCode, partner_id: { [Op.ne]: id } } 
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Vendor code already exists',
          code: 'UNIQUE_CONSTRAINT_ERROR'
        });
      }
    }

    const updateData = {
      partner_name: partnerName !== undefined ? partnerName : businessPartner.partner_name,
      partner_type: partnerType !== undefined ? partnerType : businessPartner.partner_type,
      gst_number: gstNumber !== undefined ? gstNumber.replace(/\s/g, '').toUpperCase() : businessPartner.gst_number,
      pan_card: panCard !== undefined ? panCard.replace(/\s/g, '').toUpperCase() : businessPartner.pan_card,
      tan_number: tanNumber !== undefined ? (tanNumber ? tanNumber.replace(/\s/g, '').toUpperCase() : null) : businessPartner.tan_number,
      billing_address: billingAddress !== undefined ? billingAddress : businessPartner.billing_address,
      shipping_address: sameAsBilling ? (billingAddress !== undefined ? billingAddress : businessPartner.billing_address) : (shippingAddress !== undefined ? shippingAddress : businessPartner.shipping_address),
      same_as_billing: sameAsBilling !== undefined ? sameAsBilling : businessPartner.same_as_billing,
      bank_name: bankName !== undefined ? bankName : businessPartner.bank_name,
      bank_account_name: bankAccountName !== undefined ? bankAccountName : businessPartner.bank_account_name,
      ifsc_code: ifscCode !== undefined ? ifscCode.replace(/\s/g, '').toUpperCase() : businessPartner.ifsc_code,
      account_number: accountNumber !== undefined ? accountNumber : businessPartner.account_number,
      contact_first_name: contactFirstName !== undefined ? contactFirstName : businessPartner.contact_first_name,
      contact_last_name: contactLastName !== undefined ? contactLastName : businessPartner.contact_last_name,
      contact_designation: contactDesignation !== undefined ? contactDesignation : businessPartner.contact_designation,
      contact_phone: contactPhone !== undefined ? contactPhone.replace(/\D/g, '') : businessPartner.contact_phone,
      contact_email: contactEmail !== undefined ? contactEmail.toLowerCase().trim() : businessPartner.contact_email,
      country: country !== undefined ? country : businessPartner.country,
      state: state !== undefined ? state : businessPartner.state,
      company_website: companyWebsite !== undefined ? companyWebsite : businessPartner.company_website,
      vendor_code: finalVendorCode,
      // Legacy fields
      contact_person: contactPerson !== undefined ? contactPerson : (contactFirstName && contactLastName ? `${contactFirstName} ${contactLastName}`.trim() : businessPartner.contact_person),
      email: email !== undefined ? email : (contactEmail ? contactEmail.toLowerCase().trim() : businessPartner.email),
      phone: phone !== undefined ? phone.replace(/\D/g, '') : (contactPhone ? contactPhone.replace(/\D/g, '') : businessPartner.phone),
      address: address !== undefined ? address : (billingAddress || businessPartner.address)
    };

    await businessPartner.update(updateData);

    return res.status(200).json({
      success: true,
      message: 'Business partner updated successfully',
      data: { businessPartner }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete business partner (soft delete)
 * DELETE /api/inventory/business-partners/:id
 */
export const deleteBusinessPartner = async (req, res, next) => {
  try {
    const { id } = req.params;

    const businessPartner = await BusinessPartner.findOne({
      where: { partner_id: id, is_active: true }
    });

    if (!businessPartner) {
      return res.status(404).json({
        success: false,
        message: 'Business partner not found',
        code: 'BUSINESS_PARTNER_NOT_FOUND'
      });
    }

    await businessPartner.update({ is_active: false });

    return res.status(200).json({
      success: true,
      message: 'Business partner deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

