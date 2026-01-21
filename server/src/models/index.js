// Import all models
import User from './User.js';
import Role from './Role.js';
import Asset from './Asset.js';
import AssetType from './AssetType.js';
import Company from './Company.js';
import Material from './Material.js';
import MaterialType from './MaterialType.js';
import StockArea from './StockArea.js';
import InwardEntry from './InwardEntry.js';
import InwardItem from './InwardItem.js';
import MaterialRequest from './MaterialRequest.js';
import MaterialRequestItem from './MaterialRequestItem.js';
import StockTransfer from './StockTransfer.js';
import StockTransferItem from './StockTransferItem.js';
import ConsumptionRecord from './ConsumptionRecord.js';
import ConsumptionItem from './ConsumptionItem.js';
import InventoryMaster from './InventoryMaster.js';
import MaterialAllocation from './MaterialAllocation.js';
import ReturnRecord from './ReturnRecord.js';
import ReturnItem from './ReturnItem.js';
import BusinessPartner from './BusinessPartner.js';
import PurchaseRequest from './PurchaseRequest.js';
import PurchaseRequestItem from './PurchaseRequestItem.js';
import PurchaseOrder from './PurchaseOrder.js';
import PurchaseOrderItem from './PurchaseOrderItem.js';
import Notification from './Notification.js';
import AuditLog from './AuditLog.js';
import SystemSettings from './SystemSettings.js';
import RolePagePermission from './RolePagePermission.js';
import UserPagePermission from './UserPagePermission.js';
import Group from './Group.js';
import Team from './Team.js';
import FAQ from './FAQ.js';
import ChatConversation from './ChatConversation.js';
import ChatMessage from './ChatMessage.js';
import FAQInteraction from './FAQInteraction.js';

// ==================== INVENTORY MODEL ASSOCIATIONS ====================

// StockArea associations
StockArea.belongsTo(User, { foreignKey: 'store_keeper_id', as: 'storeKeeper' });
User.hasMany(StockArea, { foreignKey: 'store_keeper_id', as: 'assignedStockAreas' });

StockArea.hasMany(InwardEntry, { foreignKey: 'stock_area_id', as: 'inwardEntries' });
InwardEntry.belongsTo(StockArea, { foreignKey: 'stock_area_id', as: 'stockArea' });

StockArea.hasMany(StockTransfer, { foreignKey: 'from_stock_area_id', as: 'transfersFrom' });
StockArea.hasMany(StockTransfer, { foreignKey: 'to_stock_area_id', as: 'transfersTo' });
StockTransfer.belongsTo(StockArea, { foreignKey: 'from_stock_area_id', as: 'fromStockArea' });
StockTransfer.belongsTo(StockArea, { foreignKey: 'to_stock_area_id', as: 'toStockArea' });

StockArea.hasMany(ConsumptionRecord, { foreignKey: 'stock_area_id', as: 'consumptionRecords' });
ConsumptionRecord.belongsTo(StockArea, { foreignKey: 'stock_area_id', as: 'stockArea' });

// Material associations
Material.hasMany(InwardItem, { foreignKey: 'material_id', as: 'inwardItems' });
InwardItem.belongsTo(Material, { foreignKey: 'material_id', as: 'material' });

Material.hasMany(MaterialRequestItem, { foreignKey: 'material_id', as: 'requestItems' });
MaterialRequestItem.belongsTo(Material, { foreignKey: 'material_id', as: 'material' });

Material.hasMany(StockTransferItem, { foreignKey: 'material_id', as: 'transferItems' });
StockTransferItem.belongsTo(Material, { foreignKey: 'material_id', as: 'material' });

Material.hasMany(ConsumptionItem, { foreignKey: 'material_id', as: 'consumptionItems' });
ConsumptionItem.belongsTo(Material, { foreignKey: 'material_id', as: 'material' });

Material.hasMany(InventoryMaster, { foreignKey: 'material_id', as: 'inventoryItems' });
InventoryMaster.belongsTo(Material, { foreignKey: 'material_id', as: 'material' });

// InwardEntry associations
InwardEntry.hasMany(InwardItem, { foreignKey: 'inward_id', as: 'items' });
InwardItem.belongsTo(InwardEntry, { foreignKey: 'inward_id', as: 'inwardEntry' });

InwardItem.hasMany(InventoryMaster, { foreignKey: 'inward_item_id', as: 'inventoryRecords' });
InventoryMaster.belongsTo(InwardItem, { foreignKey: 'inward_item_id', as: 'inwardItem' });

// MaterialRequest associations
MaterialRequest.hasMany(MaterialRequestItem, { foreignKey: 'request_id', as: 'items' });
MaterialRequestItem.belongsTo(MaterialRequest, { foreignKey: 'request_id', as: 'materialRequest' });

MaterialRequest.hasMany(StockTransfer, { foreignKey: 'material_request_id', as: 'stockTransfers' });
StockTransfer.belongsTo(MaterialRequest, { foreignKey: 'material_request_id', as: 'materialRequest' });

MaterialRequest.hasMany(MaterialAllocation, { foreignKey: 'material_request_id', as: 'allocations' });
MaterialAllocation.belongsTo(MaterialRequest, { foreignKey: 'material_request_id', as: 'materialRequest' });

MaterialRequestItem.hasMany(MaterialAllocation, { foreignKey: 'material_request_item_id', as: 'allocations' });
MaterialAllocation.belongsTo(MaterialRequestItem, { foreignKey: 'material_request_item_id', as: 'materialRequestItem' });

InventoryMaster.hasMany(MaterialAllocation, { foreignKey: 'inventory_master_id', as: 'allocations' });
MaterialAllocation.belongsTo(InventoryMaster, { foreignKey: 'inventory_master_id', as: 'inventoryItem' });

// StockTransfer associations
StockTransfer.hasMany(StockTransferItem, { foreignKey: 'transfer_id', as: 'items' });
StockTransferItem.belongsTo(StockTransfer, { foreignKey: 'transfer_id', as: 'stockTransfer' });

// ConsumptionRecord associations
ConsumptionRecord.hasMany(ConsumptionItem, { foreignKey: 'consumption_id', as: 'items' });
ConsumptionItem.belongsTo(ConsumptionRecord, { foreignKey: 'consumption_id', as: 'consumptionRecord' });

// User associations (for created_by, updated_by, requested_by, approved_by)
User.hasMany(InwardEntry, { foreignKey: 'created_by', as: 'createdInwards' });
InwardEntry.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
InwardEntry.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });

User.hasMany(MaterialRequest, { foreignKey: 'requested_by', as: 'materialRequests' });
MaterialRequest.belongsTo(User, { foreignKey: 'requested_by', as: 'requester' });
MaterialRequest.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });
MaterialRequest.belongsTo(User, { foreignKey: 'requestor_id', as: 'requestor' });
MaterialRequest.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
MaterialRequest.belongsTo(Group, { foreignKey: 'group_id', targetKey: 'group_id', as: 'group', constraints: false });
MaterialRequest.belongsTo(Team, { foreignKey: 'team_id', targetKey: 'team_id', as: 'team', constraints: false });
MaterialRequest.belongsTo(StockArea, { foreignKey: 'from_stock_area_id', as: 'fromStockArea' });

User.hasMany(StockTransfer, { foreignKey: 'created_by', as: 'createdTransfers' });
StockTransfer.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
StockTransfer.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });

User.hasMany(ConsumptionRecord, { foreignKey: 'created_by', as: 'consumptionRecords' });
ConsumptionRecord.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

User.hasMany(MaterialAllocation, { foreignKey: 'allocated_by', as: 'allocations' });
MaterialAllocation.belongsTo(User, { foreignKey: 'allocated_by', as: 'allocator' });

// ReturnRecord associations
ReturnRecord.hasMany(ReturnItem, { foreignKey: 'return_id', as: 'items' });
ReturnItem.belongsTo(ReturnRecord, { foreignKey: 'return_id', as: 'returnRecord' });

ReturnRecord.belongsTo(ConsumptionRecord, { foreignKey: 'consumption_id', as: 'consumptionRecord' });
ConsumptionRecord.hasMany(ReturnRecord, { foreignKey: 'consumption_id', as: 'returns' });

ReturnRecord.belongsTo(User, { foreignKey: 'technician_id', as: 'technician' });
ReturnRecord.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });
ReturnRecord.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
ReturnRecord.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });

ReturnItem.belongsTo(Material, { foreignKey: 'material_id', as: 'material' });
Material.hasMany(ReturnItem, { foreignKey: 'material_id', as: 'returnItems' });

ReturnItem.belongsTo(InventoryMaster, { foreignKey: 'inventory_master_id', as: 'inventoryItem' });
InventoryMaster.hasMany(ReturnItem, { foreignKey: 'inventory_master_id', as: 'returns' });

// InventoryMaster associations - location can be StockArea or User
InventoryMaster.belongsTo(StockArea, { 
  foreignKey: 'location_id', 
  as: 'stockAreaLocation',
  constraints: false // Allow null when location_type is not WAREHOUSE
});
InventoryMaster.belongsTo(User, { 
  foreignKey: 'location_id', 
  as: 'personLocation',
  constraints: false // Allow null when location_type is not PERSON
});

// BusinessPartner associations
BusinessPartner.hasMany(PurchaseOrder, { foreignKey: 'vendor_id', as: 'purchaseOrders' });
PurchaseOrder.belongsTo(BusinessPartner, { foreignKey: 'vendor_id', as: 'vendor' });

// PurchaseRequest associations
PurchaseRequest.hasMany(PurchaseRequestItem, { foreignKey: 'pr_id', as: 'items' });
PurchaseRequestItem.belongsTo(PurchaseRequest, { foreignKey: 'pr_id', as: 'purchaseRequest' });

PurchaseRequest.hasMany(PurchaseOrder, { foreignKey: 'pr_id', as: 'purchaseOrders' });
PurchaseOrder.belongsTo(PurchaseRequest, { foreignKey: 'pr_id', as: 'purchaseRequest' });

PurchaseRequest.belongsTo(User, { foreignKey: 'requested_by', as: 'requester' });
PurchaseRequest.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });
User.hasMany(PurchaseRequest, { foreignKey: 'requested_by', as: 'purchaseRequests' });

PurchaseRequestItem.belongsTo(Material, { foreignKey: 'material_id', as: 'material' });
Material.hasMany(PurchaseRequestItem, { foreignKey: 'material_id', as: 'purchaseRequestItems' });

PurchaseRequestItem.belongsTo(BusinessPartner, { foreignKey: 'business_partner_id', as: 'businessPartner' });
BusinessPartner.hasMany(PurchaseRequestItem, { foreignKey: 'business_partner_id', as: 'purchaseRequestItems' });

// PurchaseOrder associations
PurchaseOrder.hasMany(PurchaseOrderItem, { foreignKey: 'po_id', as: 'items' });
PurchaseOrderItem.belongsTo(PurchaseOrder, { foreignKey: 'po_id', as: 'purchaseOrder' });

PurchaseOrderItem.belongsTo(Material, { foreignKey: 'material_id', as: 'material' });
Material.hasMany(PurchaseOrderItem, { foreignKey: 'material_id', as: 'purchaseOrderItems' });

// InwardEntry can link to PurchaseOrder
InwardEntry.belongsTo(PurchaseOrder, { foreignKey: 'po_id', as: 'purchaseOrder' });
PurchaseOrder.hasMany(InwardEntry, { foreignKey: 'po_id', as: 'inwardEntries' });

// Notification associations
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });

// AuditLog associations
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });

// SystemSettings associations
SystemSettings.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedByUser' });
User.hasMany(SystemSettings, { foreignKey: 'updated_by', as: 'updatedSettings' });

// Page Permissions associations
RolePagePermission.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
Role.hasMany(RolePagePermission, { foreignKey: 'role_id', as: 'pagePermissions' });

UserPagePermission.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(UserPagePermission, { foreignKey: 'user_id', as: 'pagePermissions' });

// Group and Team associations
Group.hasMany(Team, { foreignKey: 'group_id', as: 'teams' });
Team.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });

// ==================== CHAT SYSTEM MODEL ASSOCIATIONS ====================

// ChatConversation associations
ChatConversation.belongsTo(User, { foreignKey: 'employee_id', as: 'employee' });
ChatConversation.belongsTo(User, { foreignKey: 'admin_id', as: 'admin' });
User.hasMany(ChatConversation, { foreignKey: 'employee_id', as: 'employeeConversations' });
User.hasMany(ChatConversation, { foreignKey: 'admin_id', as: 'adminConversations' });

// ChatMessage associations
ChatMessage.belongsTo(ChatConversation, { foreignKey: 'conversation_id', as: 'conversation' });
ChatMessage.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });
ChatConversation.hasMany(ChatMessage, { foreignKey: 'conversation_id', as: 'messages' });
User.hasMany(ChatMessage, { foreignKey: 'sender_id', as: 'sentMessages' });

// FAQInteraction associations
FAQInteraction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
FAQInteraction.belongsTo(FAQ, { foreignKey: 'faq_id', as: 'faq' });
User.hasMany(FAQInteraction, { foreignKey: 'user_id', as: 'faqInteractions' });
FAQ.hasMany(FAQInteraction, { foreignKey: 'faq_id', as: 'interactions' });

// Export all models
const models = {
  User,
  Role,
  Asset,
  AssetType,
  Company,
  Material,
  MaterialType,
  StockArea,
  InwardEntry,
  InwardItem,
  MaterialRequest,
  MaterialRequestItem,
  StockTransfer,
  StockTransferItem,
  ConsumptionRecord,
  ConsumptionItem,
  InventoryMaster,
  MaterialAllocation,
  ReturnRecord,
  ReturnItem,
  BusinessPartner,
  PurchaseRequest,
  PurchaseRequestItem,
  PurchaseOrder,
  PurchaseOrderItem,
  Notification,
  AuditLog,
  SystemSettings,
  RolePagePermission,
  UserPagePermission,
  Group,
  Team,
  FAQ,
  ChatConversation,
  ChatMessage,
  FAQInteraction,
};

export default models;
