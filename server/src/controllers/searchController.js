import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import Material from '../models/Material.js';
import StockArea from '../models/StockArea.js';
import InwardEntry from '../models/InwardEntry.js';
import InwardItem from '../models/InwardItem.js';
import MaterialRequest from '../models/MaterialRequest.js';
import StockTransfer from '../models/StockTransfer.js';
import ConsumptionRecord from '../models/ConsumptionRecord.js';
import InventoryMaster from '../models/InventoryMaster.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import PurchaseRequest from '../models/PurchaseRequest.js';
import BusinessPartner from '../models/BusinessPartner.js';
import User from '../models/User.js';
import ReturnRecord from '../models/ReturnRecord.js';

/**
 * Global search across all inventory entities
 * Searches: Materials, Stock Areas, Inward Entries, Material Requests, Stock Transfers,
 * Consumption Records, Serial Numbers, MAC IDs, Purchase Orders, Purchase Requests,
 * Business Partners, Users, Return Records, and more
 */
export const globalSearch = async (req, res, next) => {
  try {
    const { q, type, limit = 20, page = 1 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const searchTerm = q.trim();
    const searchLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 50);
    const pageNumber = Math.max(parseInt(page) || 1, 1);
    const orgId = req.user?.org_id || req.user?.orgId || req.user?.organizationId || req.user?.organisationId || null;
    const perEntityLimit = searchLimit * pageNumber;
    const formattedResults = [];

    // Helper to safely run each entity search without failing the whole request
    const safeRun = async (label, fn) => {
      try {
        await fn();
      } catch (err) {
        console.error(`[search] ${label} failed:`, err?.message || err);
      }
    };

    // Helper function to format results
    const withOrg = (base) => (orgId ? { ...base, org_id: orgId } : base);

    const formatResult = (entityType, entityId, title, description, metadata = {}) => {
      return {
        entityType,
        entityId,
        title,
        description,
        ...metadata
      };
    };

    // 1. Search Materials (by name, product code, type, description)
    await safeRun('materials', async () => {
      if (type && type !== 'materials') return;
      const materials = await Material.findAll({
        where: withOrg({
          is_active: true,
          [Op.or]: [
            { material_name: { [Op.like]: `%${searchTerm}%` } },
            { product_code: { [Op.like]: `%${searchTerm}%` } },
            { material_type: { [Op.like]: `%${searchTerm}%` } },
            { description: { [Op.like]: `%${searchTerm}%` } },
          ],
        }),
        limit: perEntityLimit,
        attributes: ['material_id', 'material_name', 'product_code', 'material_type', 'uom', 'description'],
      });
      
      materials.forEach(m => {
        formattedResults.push(formatResult(
          'material',
          m.material_id,
          `${m.material_name} (${m.product_code})`,
          `Type: ${m.material_type} | UOM: ${m.uom}`,
          { materialType: m.material_type, productCode: m.product_code }
        ));
      });
    });

    // 2. Search Serial Numbers and MAC IDs (from InventoryMaster)
    await safeRun('inventory', async () => {
      if (type && !(type === 'serial' || type === 'inventory')) return;
      const inventoryItems = await InventoryMaster.findAll({
        where: withOrg({
          is_active: true,
          [Op.or]: [
            { serial_number: { [Op.like]: `%${searchTerm}%` } },
            { mac_id: { [Op.like]: `%${searchTerm}%` } },
            { ticket_id: { [Op.like]: `%${searchTerm}%` } },
          ],
        }),
        include: [
          {
            model: Material,
            as: 'material',
            attributes: ['material_name', 'product_code'],
          },
        ],
        limit: perEntityLimit,
        attributes: ['id', 'serial_number', 'mac_id', 'ticket_id', 'status', 'current_location_type'],
      });

      inventoryItems.forEach(item => {
        const title = item.serial_number 
          ? `Serial: ${item.serial_number}${item.mac_id ? ` | MAC: ${item.mac_id}` : ''}`
          : item.mac_id 
          ? `MAC: ${item.mac_id}`
          : `Inventory ID: ${item.id}`;
        
        formattedResults.push(formatResult(
          'inventory',
          item.id,
          title,
          `Material: ${item.material?.material_name || 'Unknown'} | Status: ${item.status} | Location: ${item.current_location_type}${item.ticket_id ? ` | Ticket: ${item.ticket_id}` : ''}`,
          { serialNumber: item.serial_number, macId: item.mac_id, ticketId: item.ticket_id }
        ));
      });
    });

    // 3. Search Inward Entries (by slip number, invoice, party, PO, vehicle, remarks)
    await safeRun('inward', async () => {
      if (type && type !== 'inward') return;
      const inwards = await InwardEntry.findAll({
        where: withOrg({
          is_active: true,
          [Op.or]: [
            { slip_number: { [Op.like]: `%${searchTerm}%` } },
            { invoice_number: { [Op.like]: `%${searchTerm}%` } },
            { party_name: { [Op.like]: `%${searchTerm}%` } },
            { purchase_order: { [Op.like]: `%${searchTerm}%` } },
            { vehicle_number: { [Op.like]: `%${searchTerm}%` } },
            { remark: { [Op.like]: `%${searchTerm}%` } },
          ],
        }),
        limit: perEntityLimit,
        attributes: ['inward_id', 'slip_number', 'invoice_number', 'party_name', 'date', 'status', 'vehicle_number'],
      });

      inwards.forEach(inward => {
        formattedResults.push(formatResult(
          'inward',
          inward.inward_id,
          `Inward: ${inward.slip_number} | ${inward.party_name}`,
          `Invoice: ${inward.invoice_number} | Date: ${inward.date} | Status: ${inward.status}`,
          { slipNumber: inward.slip_number, invoiceNumber: inward.invoice_number, status: inward.status }
        ));
      });
    });

    // 4. Search Material Requests (by request ID, PR numbers, status, remarks)
    await safeRun('materialRequest', async () => {
      if (type && type !== 'materialRequest') return;
      const materialRequests = await MaterialRequest.findAll({
        where: withOrg({
          is_active: true,
          [Op.or]: [
            { request_id: { [Op.like]: `%${searchTerm}%` } },
            { status: { [Op.like]: `%${searchTerm}%` } },
            { remarks: { [Op.like]: `%${searchTerm}%` } },
          ],
        }),
        limit: perEntityLimit * 2, // Get more to filter by pr_numbers
        attributes: ['request_id', 'pr_numbers', 'status', 'created_at', 'remarks'],
      });

      // Filter by pr_numbers in application layer since it's JSON
      const filteredRequests = materialRequests.filter(req => {
        const prNumbers = req.pr_numbers || [];
        const matchesPR = prNumbers.some(pr => 
          pr.prNumber && pr.prNumber.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return matchesPR || true; // Include all since we already filtered by other fields
      }).slice(0, perEntityLimit);

      filteredRequests.forEach(req => {
        const prNumbers = req.pr_numbers || [];
        const prList = prNumbers.map(pr => pr.prNumber).join(', ') || 'N/A';
        formattedResults.push(formatResult(
          'materialRequest',
          req.request_id,
          `Material Request: ${req.request_id}`,
          `PR Numbers: ${prList} | Status: ${req.status}`,
          { status: req.status, prNumbers: prList }
        ));
      });
    });

    // 5. Search Stock Transfers (by transfer number, remarks, status)
    await safeRun('stockTransfer', async () => {
      if (type && type !== 'stockTransfer') return;
      const stockTransfers = await StockTransfer.findAll({
        where: withOrg({
          is_active: true,
          [Op.or]: [
            { transfer_number: { [Op.like]: `%${searchTerm}%` } },
            { remarks: { [Op.like]: `%${searchTerm}%` } },
            { status: { [Op.like]: `%${searchTerm}%` } },
          ],
        }),
        limit: perEntityLimit,
        attributes: ['transfer_id', 'transfer_number', 'transfer_date', 'status', 'remarks'],
      });

      stockTransfers.forEach(transfer => {
        formattedResults.push(formatResult(
          'stockTransfer',
          transfer.transfer_id,
          `Stock Transfer: ${transfer.transfer_number}`,
          `Date: ${transfer.transfer_date} | Status: ${transfer.status}${transfer.remarks ? ` | Remarks: ${transfer.remarks}` : ''}`,
          { transferNumber: transfer.transfer_number, status: transfer.status, remarks: transfer.remarks }
        ));
      });
    });

    // 6. Search Consumption Records (by external ref, ticket ID, remarks)
    await safeRun('consumption', async () => {
      if (type && type !== 'consumption') return;
      const consumptions = await ConsumptionRecord.findAll({
        where: withOrg({
          is_active: true,
          [Op.or]: [
            { external_system_ref_id: { [Op.like]: `%${searchTerm}%` } },
            { ticket_id: { [Op.like]: `%${searchTerm}%` } },
            { remarks: { [Op.like]: `%${searchTerm}%` } },
          ],
        }),
        limit: perEntityLimit,
        attributes: ['consumption_id', 'external_system_ref_id', 'consumption_date', 'ticket_id', 'remarks'],
      });

      consumptions.forEach(consumption => {
        formattedResults.push(formatResult(
          'consumption',
          consumption.consumption_id,
          `Consumption: ${consumption.external_system_ref_id || consumption.consumption_id}`,
          `Date: ${consumption.consumption_date}${consumption.ticket_id ? ` | Ticket: ${consumption.ticket_id}` : ''}`,
          { ticketId: consumption.ticket_id, externalRef: consumption.external_system_ref_id }
        ));
      });
    });

    // 7. Search Purchase Orders (by PO number, vendor, status, remarks)
    await safeRun('purchaseOrder', async () => {
      if (type && type !== 'purchaseOrder') return;
      const purchaseOrders = await PurchaseOrder.findAll({
        where: withOrg({
          is_active: true,
          [Op.or]: [
            { po_number: { [Op.like]: `%${searchTerm}%` } },
            { remarks: { [Op.like]: `%${searchTerm}%` } },
            { status: { [Op.like]: `%${searchTerm}%` } },
          ],
        }),
        include: [
          {
            model: BusinessPartner,
            as: 'vendor',
            attributes: ['partner_name'],
          },
        ],
        limit: perEntityLimit,
        attributes: ['po_id', 'po_number', 'po_date', 'status', 'remarks'],
      });

      purchaseOrders.forEach(po => {
        formattedResults.push(formatResult(
          'purchaseOrder',
          po.po_id,
          `Purchase Order: ${po.po_number}`,
          `Vendor: ${po.vendor?.partner_name || 'N/A'} | Date: ${po.po_date} | Status: ${po.status}`,
          { poNumber: po.po_number, status: po.status, vendorName: po.vendor?.partner_name }
        ));
      });
    });

    // 8. Search Purchase Requests (by PR number, status, remarks)
    await safeRun('purchaseRequest', async () => {
      if (type && type !== 'purchaseRequest') return;
      const purchaseRequests = await PurchaseRequest.findAll({
        where: withOrg({
          is_active: true,
          [Op.or]: [
            { pr_number: { [Op.like]: `%${searchTerm}%` } },
            { status: { [Op.like]: `%${searchTerm}%` } },
            { remarks: { [Op.like]: `%${searchTerm}%` } },
          ],
        }),
        limit: perEntityLimit,
        attributes: ['pr_id', 'pr_number', 'requested_date', 'status', 'remarks'],
      });

      purchaseRequests.forEach(pr => {
        formattedResults.push(formatResult(
          'purchaseRequest',
          pr.pr_id,
          `Purchase Request: ${pr.pr_number}`,
          `Date: ${pr.requested_date} | Status: ${pr.status}`,
          { prNumber: pr.pr_number, status: pr.status }
        ));
      });
    });

    // 9. Search Business Partners (by name, type, contact, email, phone, address)
    await safeRun('businessPartner', async () => {
      if (type && type !== 'businessPartner') return;
      const businessPartners = await BusinessPartner.findAll({
        where: withOrg({
          is_active: true,
          [Op.or]: [
            { partner_name: { [Op.like]: `%${searchTerm}%` } },
            { partner_type: { [Op.like]: `%${searchTerm}%` } },
            { contact_person: { [Op.like]: `%${searchTerm}%` } },
            { email: { [Op.like]: `%${searchTerm}%` } },
            { phone: { [Op.like]: `%${searchTerm}%` } },
            { address: { [Op.like]: `%${searchTerm}%` } },
          ],
        }),
        limit: perEntityLimit,
        attributes: ['partner_id', 'partner_name', 'partner_type', 'contact_person', 'email', 'phone'],
      });

      businessPartners.forEach(partner => {
        formattedResults.push(formatResult(
          'businessPartner',
          partner.partner_id,
          `${partner.partner_name} (${partner.partner_type})`,
          `Contact: ${partner.contact_person || 'N/A'} | ${partner.email || ''} | ${partner.phone || ''}`,
          { partnerType: partner.partner_type, email: partner.email, phone: partner.phone }
        ));
      });
    });

    // 10. Search Stock Areas (by name, location code, address)
    await safeRun('stockArea', async () => {
      if (type && type !== 'stockArea') return;
      const stockAreas = await StockArea.findAll({
        where: withOrg({
          is_active: true,
          [Op.or]: [
            { area_name: { [Op.like]: `%${searchTerm}%` } },
            { location_code: { [Op.like]: `%${searchTerm}%` } },
            { address: { [Op.like]: `%${searchTerm}%` } },
          ],
        }),
        include: [
          {
            model: User,
            as: 'storeKeeper',
            attributes: ['name', 'email'],
          },
        ],
        limit: perEntityLimit,
        attributes: ['area_id', 'area_name', 'location_code', 'address'],
      });

      stockAreas.forEach(area => {
        formattedResults.push(formatResult(
          'stockArea',
          area.area_id,
          `Stock Area: ${area.area_name}`,
          `Location Code: ${area.location_code || 'N/A'}${area.storeKeeper ? ` | Store Keeper: ${area.storeKeeper.name}` : ''}`,
          { locationCode: area.location_code, storeKeeper: area.storeKeeper?.name }
        ));
      });
    });

    // 11. Users are intentionally excluded from global search results per requirement

    // 12. Search Return Records (by return ID, ticket ID, reason, remarks)
    if (!type || type === 'return') {
      const returnRecords = await ReturnRecord.findAll({
        where: withOrg({
          is_active: true,
          [Op.or]: [
            { return_id: { [Op.like]: `%${searchTerm}%` } },
            { ticket_id: { [Op.like]: `%${searchTerm}%` } },
            { reason: { [Op.like]: `%${searchTerm}%` } },
            { remarks: { [Op.like]: `%${searchTerm}%` } },
          ],
        }),
        limit: perEntityLimit,
        attributes: ['return_id', 'return_date', 'ticket_id', 'reason', 'status', 'remarks', 'org_id'],
      });

      returnRecords.forEach(returnRecord => {
        formattedResults.push(formatResult(
          'return',
          returnRecord.return_id,
          `Return: ${returnRecord.return_id}${returnRecord.ticket_id ? ` | Ticket: ${returnRecord.ticket_id}` : ''}`,
          `Date: ${returnRecord.return_date} | Reason: ${returnRecord.reason || 'N/A'} | Status: ${returnRecord.status}`,
          { ticketId: returnRecord.ticket_id, reason: returnRecord.reason, status: returnRecord.status }
        ));
      });
    }

    // 13. Search Inward Items by serial number or MAC ID (through InwardItem)
    if (!type || type === 'inwardItem') {
      const inwardItems = await InwardItem.findAll({
        where: {
          [Op.or]: [
            { serial_number: { [Op.like]: `%${searchTerm}%` } },
            { mac_id: { [Op.like]: `%${searchTerm}%` } },
            { remarks: { [Op.like]: `%${searchTerm}%` } },
          ],
        },
        include: [
          {
            model: InwardEntry,
            as: 'inwardEntry',
            attributes: ['inward_id', 'slip_number', 'invoice_number', 'party_name'],
          },
          {
            model: Material,
            as: 'material',
            attributes: ['material_name', 'product_code'],
          },
        ],
        limit: perEntityLimit,
        attributes: ['item_id', 'serial_number', 'mac_id', 'quantity', 'price', 'remarks'],
      });

      inwardItems.forEach(item => {
        const title = item.serial_number 
          ? `Serial: ${item.serial_number}${item.mac_id ? ` | MAC: ${item.mac_id}` : ''}`
          : item.mac_id 
          ? `MAC: ${item.mac_id}`
          : `Item: ${item.item_id}`;
        
        formattedResults.push(formatResult(
          'inwardItem',
          item.item_id,
          title,
          `Material: ${item.material?.material_name || 'Unknown'} | Inward: ${item.inwardEntry?.slip_number || 'N/A'} | Invoice: ${item.inwardEntry?.invoice_number || 'N/A'}`,
          { 
            serialNumber: item.serial_number, 
            macId: item.mac_id,
            inwardId: item.inwardEntry?.inward_id,
            materialName: item.material?.material_name
          }
        ));
      });
    }

    // Sort results by relevance (exact matches first, then partial matches)
    formattedResults.sort((a, b) => {
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();
      const searchTermLower = searchTerm.toLowerCase();
      const aExact = aTitle === searchTermLower || aTitle.startsWith(searchTermLower);
      const bExact = bTitle === searchTermLower || bTitle.startsWith(searchTermLower);
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return aTitle.localeCompare(bTitle);
    });

    // Pagination over aggregated results
    const pageSize = searchLimit * 2; // keep breadth per page
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const limitedResults = formattedResults.slice(startIndex, endIndex);
    const hasMore = formattedResults.length > endIndex;

    // Group results by entity type for summary
    const summary = {};
    limitedResults.forEach(result => {
      summary[result.entityType] = (summary[result.entityType] || 0) + 1;
    });

    res.status(200).json({
      success: true,
      data: {
        query: searchTerm,
        results: limitedResults,
        summary: {
          total: limitedResults.length,
          ...summary
        },
        pagination: {
          page: pageNumber,
          limit: searchLimit,
          pageSize,
          hasMore
        }
      },
    });
  } catch (error) {
    next(error);
  }
};
