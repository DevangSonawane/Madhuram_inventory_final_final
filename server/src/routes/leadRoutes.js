import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validator.js';
import { addExpense, getExpenses, approveExpense, getSurvey, getSurveyById, getSummary, addSurvey, postExecutiveManagement, getExecutiveManagement, getEMById, deleteExecutiveManagement, resetPassword, createLead, getAllLeads, getLeadByUniqueId, updateLeadStatus, createOrUpdateCustomerDetails, getCustomerDetailsByLeadId, sendCustomerDetailsFrom, gisStatusChange, submitKyc } from '../controllers/leadController.js';
import { upload, uploadKycFiles } from '../middleware/upload.js';
import { authenticate } from '../middleware/auth.js';
import { leadStatus } from '../utils/leadHelpers.js';

const router = express.Router();
router.get("/health", (req, rs) => {
  rs.json({ mssaage: "OK" })
})
router.post(
  '/expense/add',
  upload.array('billImages', 2),
  body('category').notEmpty().withMessage('Category required'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  validate,
  addExpense
);

router.get('/expense', getExpenses);
router.post('/expense/approve/:id', approveExpense);

// SURVEY
router.get('/survey', getSurvey);
router.get('/survey/summary', getSummary);
router.get('/survey/:id', getSurveyById);
router.post(
  '/survey/add',
  authenticate,
  [
    body('latitude')
      .optional({ nullable: true })
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90 degrees'),
    body('longitude')
      .optional({ nullable: true })
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180 degrees')
  ],
  validate,
  addSurvey
);


// Executive Management
router.post('/em/users',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('employeCode')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Employee code cannot be empty if provided'),
    body('phoneNumber')
      .optional()
      .matches(/^[0-9]{10,15}$/)
      .withMessage('Phone number must be 10-15 digits'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Valid email is required if provided'),
    body('roleId').isInt().withMessage('Role ID is required'),
    body('moduleIds').isArray().withMessage('Module IDs must be an array'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    body().custom((value, { req }) => {
      if (!req.body.employeCode && !req.body.phoneNumber && !req.body.email) {
        throw new Error('At least one of employeCode, phoneNumber, or email is required');
      }
      return true;
    })
  ],
  validate,
  postExecutiveManagement
);
// Executive Management
router.put('/em/users/:id',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
    body('roleId').isInt().withMessage('Role ID is required'),
    body('moduleIds').isArray().withMessage('Module IDs must be an array'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
  ],
  validate,
  postExecutiveManagement
);
router.put('/em/users/:id/password-reset', 
  [
    body('oldPassword').notEmpty().withMessage('Old password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
  ],
  validate,
  resetPassword
);


router.get('/em/users', getExecutiveManagement);
router.delete('/em/users/:id', deleteExecutiveManagement);
router.get('/em/users/:id', getEMById);

// Lead Management Routes
router.post(
  '/',
  authenticate,
  [
    body('id').optional().isInt().withMessage('ID must be an integer if provided for update'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone_number').trim().notEmpty().withMessage('Phone number is required'),
    body('address').trim().notEmpty().withMessage('Address is required'),
    body('source').trim().notEmpty().withMessage('Source is required'),
    body('sales_executive').optional().isInt().withMessage('Sales executive (user id) must be an integer if provided'),
    body('service_type').isIn(['SME', 'BROADBAND', 'LEASEDLINE']).withMessage('Service type must be one of: SME, BROADBAND, LEASEDLINE'),
    body('status').optional().isIn([...Object.values(leadStatus)]).withMessage('Invalid status value')
  ],
  validate,
  createLead
);

router.get('/', getAllLeads);
router.get('/unique/:unique_id', getLeadByUniqueId);

// Update Lead Status
router.patch(
  '/:unique_id/status',
  authenticate,
  [
    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn([
        ...Object.values(leadStatus),
      ])
      .withMessage('Invalid status value')
  ],
  validate,
  updateLeadStatus
);

// Customer Details Routes
router.post(
  '/:unique_id/customer-details',
  authenticate,
  [
    body('id').optional().isInt().withMessage('ID must be an integer if provided for update'),
    body('first_name').trim().notEmpty().withMessage('First name is required'),
    body('last_name').optional({ nullable: true, checkFalsy: true }).trim(),
    body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Valid email is required if provided'),
    body('alternate_phone').optional({ nullable: true, checkFalsy: true }).matches(/^[0-9]{10,15}$/).withMessage('Alternate phone must be 10-15 digits'),
    body('date_of_birth').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Date of birth must be a valid date'),
    body('gender').optional({ nullable: true, checkFalsy: true }).isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female, or Other'),
    body('contact_phone').optional({ nullable: true, checkFalsy: true }).matches(/^[0-9]{10,15}$/).withMessage('Contact phone must be 10-15 digits'),
    body('contact_email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Valid contact email is required if provided'),
    body('present_address_line1').optional({ nullable: true, checkFalsy: true }).trim(),
    body('present_address_line2').optional({ nullable: true, checkFalsy: true }).trim(),
    body('present_city').optional({ nullable: true, checkFalsy: true }).trim(),
    body('present_state').optional({ nullable: true, checkFalsy: true }).trim(),
    body('present_pincode').optional({ nullable: true, checkFalsy: true }).trim(),
    body('present_country').optional({ nullable: true, checkFalsy: true }).trim(),
    body('payment_address_same_as_present').optional({ nullable: true }).isBoolean().withMessage('payment_address_same_as_present must be a boolean'),
    body('payment_address_line1').optional({ nullable: true, checkFalsy: true }).trim(),
    body('payment_address_line2').optional({ nullable: true, checkFalsy: true }).trim(),
    body('payment_city').optional({ nullable: true, checkFalsy: true }).trim(),
    body('payment_state').optional({ nullable: true, checkFalsy: true }).trim(),
    body('payment_pincode').optional({ nullable: true, checkFalsy: true }).trim(),
    body('payment_country').optional({ nullable: true, checkFalsy: true }).trim(),
    body('latitude').optional({ nullable: true, checkFalsy: true }).isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
    body('longitude').optional({ nullable: true, checkFalsy: true }).isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
    body('plan_id').optional({ nullable: true, checkFalsy: true }).isInt().withMessage('Plan ID must be an integer'),
    body('static_ip_required').optional({ nullable: true }).isBoolean().withMessage('static_ip_required must be a boolean'),
    body('telephone_line_required').optional({ nullable: true }).isBoolean().withMessage('telephone_line_required must be a boolean')
  ],
  validate,
  createOrUpdateCustomerDetails
);

router.get('/customer-details/:unique_id', getCustomerDetailsByLeadId);

// Send Customer Details Link
router.get('/sendCustomerDetailsFrom/:leadId', authenticate, sendCustomerDetailsFrom);

// Update GIS Status
router.post(
  '/gisStatusChange',
  authenticate,
  [
    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['FEASIBLE', 'NOT_FEASIBLE', 'INCORRECT_LOCATION'])
      .withMessage('Status must be one of: FEASIBLE, NOT_FEASIBLE, INCORRECT_LOCATION'),
    body('lead_id')
      .notEmpty()
      .withMessage('Lead ID (unique_id) is required'),
    body('remark')
      .optional({ nullable: true, checkFalsy: true })
      .trim(),
    body('distance')
      .optional({ nullable: true, checkFalsy: true })
      .isFloat({ min: 0 })
      .withMessage('Distance must be a valid positive number'),
    body('optical_type')
      .optional({ nullable: true, checkFalsy: true })
      .isIn(['GPON', 'EPON', 'Media convertor'])
      .withMessage('Optical type must be one of: GPON, EPON, Media convertor')
  ],
  validate,
  gisStatusChange
);

// Submit KYC
router.post(
  '/:unique_id/kyc',
  uploadKycFiles, // Handle file uploads first
  [
    body('id_type')
      .notEmpty()
      .withMessage('ID type is required'),
    body('id_number')
      .notEmpty()
      .withMessage('ID number is required'),
    body('address_proof_type')
      .notEmpty()
      .withMessage('Address proof type is required'),
    body('terms_accepted')
      .custom((value) => {
        if (value !== 'true' && value !== true) {
          throw new Error('Terms and conditions must be accepted');
        }
        return true;
      }),
    body('address_proof_number')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
  ],
  validate,
  submitKyc
);

export default router;
