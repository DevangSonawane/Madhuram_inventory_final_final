import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import InwardEntry from '../models/InwardEntry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Download document/file
 */
export const downloadDocument = async (req, res, next) => {
  try {
    const { filename } = req.params;

    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'Filename is required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Try multiple upload directories (inward, purchase-orders, materials)
    const uploadDirs = [
      { dir: path.join(__dirname, '../../uploads/inward'), name: 'inward' },
      { dir: path.join(__dirname, '../../uploads/purchase-orders'), name: 'purchase-orders' },
      { dir: path.join(__dirname, '../../uploads/materials'), name: 'materials' }
    ];

    let filePath = null;
    const justFilename = filename.includes('/') ? filename.split('/').pop() : filename;

    // Find which directory contains the file
    for (const { dir } of uploadDirs) {
      const testPath = path.join(dir, justFilename);
      if (fs.existsSync(testPath)) {
        filePath = testPath;
        break;
      }
    }

    // If not found, try with full path
    if (!filePath && filename.includes('/')) {
      for (const { dir } of uploadDirs) {
        const testPath = path.join(dir, filename.replace(/^\/uploads\/(inward|purchase-orders|materials)\//, ''));
        if (fs.existsSync(testPath)) {
          filePath = testPath;
          break;
        }
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
        code: 'FILE_NOT_FOUND'
      });
    }

    // Send file
    res.download(filePath, justFilename, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Error downloading file',
            code: 'FILE_DOWNLOAD_ERROR'
          });
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete document
 */
export const deleteDocument = async (req, res, next) => {
  try {
    const { filename } = req.params;

    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'Filename is required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Try multiple upload directories (inward, purchase-orders, materials)
    const uploadDirs = [
      path.join(__dirname, '../../uploads/inward'),
      path.join(__dirname, '../../uploads/purchase-orders'),
      path.join(__dirname, '../../uploads/materials')
    ];

    let filePath = null;
    let foundDir = null;

    // Find which directory contains the file
    for (const dir of uploadDirs) {
      const testPath = path.join(dir, filename);
      if (fs.existsSync(testPath)) {
        filePath = testPath;
        foundDir = dir;
        break;
      }
    }

    // If not found, try with just the filename in each directory
    if (!filePath) {
      const justFilename = filename.includes('/') ? filename.split('/').pop() : filename;
      for (const dir of uploadDirs) {
        const testPath = path.join(dir, justFilename);
        if (fs.existsSync(testPath)) {
          filePath = testPath;
          foundDir = dir;
          break;
        }
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
        code: 'FILE_NOT_FOUND'
      });
    }

    // Delete file
    fs.unlinkSync(filePath);

    // Remove from any records that reference it
    const justFilename = filename.includes('/') ? filename.split('/').pop() : filename;
    const docPath = foundDir.includes('purchase-orders') 
      ? `/uploads/purchase-orders/${justFilename}`
      : foundDir.includes('materials')
      ? `/uploads/materials/${justFilename}`
      : `/uploads/inward/${justFilename}`;

    // Remove from InwardEntry
    const inwardEntries = await InwardEntry.findAll({
      where: {
        is_active: true,
      },
    });

    for (const entry of inwardEntries) {
      if (entry.documents) {
        let updatedDocuments = [];
        if (Array.isArray(entry.documents)) {
          updatedDocuments = entry.documents.filter(
            doc => {
              const docName = doc.includes('/') ? doc.split('/').pop() : doc;
              return docName !== justFilename && doc !== docPath && !doc.includes(justFilename);
            }
          );
        } else if (typeof entry.documents === 'string') {
          try {
            const parsed = JSON.parse(entry.documents);
            if (Array.isArray(parsed)) {
              updatedDocuments = parsed.filter(
                doc => {
                  const docName = doc.includes('/') ? doc.split('/').pop() : doc;
                  return docName !== justFilename && doc !== docPath && !doc.includes(justFilename);
                }
              );
            }
          } catch {
            // If not JSON, skip
          }
        }
        if (updatedDocuments.length !== (Array.isArray(entry.documents) ? entry.documents.length : 1)) {
          await entry.update({ documents: updatedDocuments });
        }
      }
    }

    // Remove from PurchaseOrder (if purchase-orders directory)
    if (foundDir && foundDir.includes('purchase-orders')) {
      const PurchaseOrder = (await import('../models/PurchaseOrder.js')).default;
      const purchaseOrders = await PurchaseOrder.findAll({
        where: {
          is_active: true,
        },
      });

      for (const po of purchaseOrders) {
        if (po.documents) {
          let updatedDocuments = [];
          if (Array.isArray(po.documents)) {
            updatedDocuments = po.documents.filter(
              doc => {
                const docName = doc.includes('/') ? doc.split('/').pop() : doc;
                return docName !== justFilename && doc !== docPath && !doc.includes(justFilename);
              }
            );
          } else if (typeof po.documents === 'string') {
            try {
              const parsed = JSON.parse(po.documents);
              if (Array.isArray(parsed)) {
                updatedDocuments = parsed.filter(
                  doc => {
                    const docName = doc.includes('/') ? doc.split('/').pop() : doc;
                    return docName !== justFilename && doc !== docPath && !doc.includes(justFilename);
                  }
                );
              }
            } catch {
              // If not JSON, skip
            }
          }
          if (updatedDocuments.length !== (Array.isArray(po.documents) ? po.documents.length : 1)) {
            await po.update({ documents: updatedDocuments });
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add documents to existing inward entry
 */
export const addDocumentsToInward = async (req, res, next) => {
  try {
    const { inwardId } = req.params;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
        code: 'VALIDATION_ERROR'
      });
    }

    const inward = await InwardEntry.findByPk(inwardId);

    if (!inward) {
      return res.status(404).json({
        success: false,
        message: 'Inward entry not found',
        code: 'INWARD_ENTRY_NOT_FOUND'
      });
    }

    // Get existing documents
    const existingDocuments = inward.documents && Array.isArray(inward.documents) 
      ? inward.documents 
      : [];

    // Add new file paths
    const newDocuments = files.map(file => `/uploads/inward/${file.filename}`);
    const updatedDocuments = [...existingDocuments, ...newDocuments];

    await inward.update({ documents: updatedDocuments });

    res.status(200).json({
      success: true,
      message: 'Documents added successfully',
      data: {
        documents: updatedDocuments,
      },
    });
  } catch (error) {
    next(error);
  }
};













