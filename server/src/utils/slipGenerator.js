import { Op } from 'sequelize';

/**
 * Generate slip number with format: PREFIX-MONTH-YEAR-RANDOM
 * Example: GRN-SEP-2025-34
 */
export const generateSlipNumber = (prefix) => {
  const date = new Date();
  const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
  const year = date.getFullYear();
  const random = Math.floor(Math.random() * 100);
  return `${prefix}-${month}-${year}-${random}`;
};

export const generateGRN = () => {
  return generateSlipNumber('GRN');
};

export const generateST = () => {
  return generateSlipNumber('ST');
};

/**
 * Generate ST (Stock Transfer) number with format: ST-MONTH(ABV)-YEAR-NUMBER
 * Example: ST-JAN-2025-001
 * The number is sequential based on existing STs in the same month/year
 */
export const generateSTSequential = async (StockTransfer) => {
  const date = new Date();
  const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
  const year = date.getFullYear();
  
  // Find the highest ST number for this month/year
  const prefix = `ST-${month}-${year}`;
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  
  const existingSTs = await StockTransfer.findAll({
    where: {
      transfer_number: {
        [Op.like]: `${prefix}-%`
      }
    },
    attributes: ['transfer_number'],
    order: [['transfer_number', 'DESC']],
    limit: 1
  });
  
  let nextNumber = 1;
  if (existingSTs.length > 0) {
    const lastST = existingSTs[0].transfer_number;
    const match = lastST.match(pattern);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }
  
  // Format number with leading zeros (001, 002, etc.)
  const numberStr = String(nextNumber).padStart(3, '0');
  return `${prefix}-${numberStr}`;
};

/**
 * Generate MR number with format: MR-MONTH(ABV)-YEAR-NUMBER
 * Example: MR-JAN-2025-001
 * The number is sequential based on existing MRs in the same month/year
 * @param {Object} MaterialRequest - The MaterialRequest model
 * @param {Date|string} requestDate - The request date to use for month/year (defaults to current date)
 */
export const generateMR = async (MaterialRequest, requestDate = null) => {
  // Use provided requestDate or current date
  const date = requestDate ? new Date(requestDate) : new Date();
  const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
  const year = date.getFullYear();
  
  // Find the highest MR number for this month/year
  const prefix = `MR-${month}-${year}`;
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  
  const existingMRs = await MaterialRequest.findAll({
    where: {
      mr_number: {
        [Op.like]: `${prefix}-%`
      }
    },
    attributes: ['mr_number'],
    order: [['mr_number', 'DESC']],
    limit: 1
  });
  
  let nextNumber = 1;
  if (existingMRs.length > 0) {
    const lastMR = existingMRs[0].mr_number;
    const match = lastMR.match(pattern);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }
  
  // Format number with leading zeros (001, 002, etc.)
  const numberStr = String(nextNumber).padStart(3, '0');
  return `${prefix}-${numberStr}`;
};













