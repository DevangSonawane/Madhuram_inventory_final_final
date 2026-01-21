import FAQ from '../models/FAQ.js';
import sequelize from '../config/database.js';

/**
 * Seed initial FAQs for Inventory Management System
 * Run this script to populate comprehensive FAQs with detailed documentation
 * 
 * Usage: node src/scripts/seedFAQs.js
 */

const seedFAQs = async () => {
  try {
    console.log('🌱 Starting FAQ seeding...\n');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Sync FAQ model
    await FAQ.sync({ alter: false });
    console.log('✅ FAQ table synchronized\n');

    const faqs = [
      // ==================== MATERIAL MANAGEMENT ====================
      {
        question: 'How do I add a new material to the inventory system?',
        answer: `To add a new material to the inventory system:

1. Navigate to the "Material Management" page from the sidebar
2. Click the "Add Material" button
3. Fill in the required fields:
   - Material Name: Enter a descriptive name for the material
   - Product Code: Enter a unique product code (system will validate uniqueness)
   - Material Type: Select from available types (e.g., Raw Material, Finished Goods, Consumables)
   - Unit of Measurement (UOM): Select appropriate unit (e.g., kg, pcs, liters)
   - Description: Add any additional details about the material (optional)
4. Optionally upload supporting documents or images
5. Click "Save" to create the material

Note: Product codes must be unique across the system. If a code already exists, you'll receive a validation error.

After creation, the material will be available for use in purchase requests, inward transactions, and stock transfers.`,
        category: 'Material Management',
        keywords: ['material', 'add', 'create', 'product', 'inventory', 'new material']
      },
      {
        question: 'How do I edit or update an existing material?',
        answer: `To edit an existing material:

1. Go to "Material Management" page
2. Find the material you want to edit from the list
3. Click on the material row or use the "Edit" button/icon
4. Modify the fields you want to change
5. Click "Save" to update

Important Notes:
- Product codes cannot be changed after creation to maintain data integrity
- You can update material name, type, UOM, and description
- Changes to materials affect all future transactions but don't modify historical records
- Only users with appropriate permissions can edit materials`,
        category: 'Material Management',
        keywords: ['material', 'edit', 'update', 'modify', 'change']
      },
      {
        question: 'What is a Product Code and why is it important?',
        answer: `A Product Code is a unique identifier assigned to each material in the system.

Key Points:
- Product codes must be unique - no two materials can have the same code
- They are used to identify materials quickly in reports and transactions
- Once assigned, product codes cannot be changed
- Product codes help in:
  * Stock tracking and reconciliation
  * Purchase order processing
  * Generating inventory reports
  * Preventing duplicate entries

Best Practices:
- Use consistent naming conventions (e.g., MAT-001, RAW-ABC-001)
- Make codes meaningful but concise
- Include material type or category in the code when possible
- Avoid using special characters that might cause issues`,
        category: 'Material Management',
        keywords: ['product code', 'code', 'identifier', 'unique', 'SKU']
      },

      // ==================== PURCHASE REQUESTS ====================
      {
        question: 'How do I create a purchase request?',
        answer: `Creating a Purchase Request allows you to request materials that need to be purchased.

Steps to create a Purchase Request:

1. Navigate to "Purchase Request" from the sidebar
2. Click "Create Purchase Request" button
3. Fill in the request details:
   - Request Date: Automatically set to today (can be modified)
   - Priority: Select from Low, Medium, High, Urgent
   - Requested By: Your name (auto-filled)
   - Department: Select your department
   - Notes: Add any special instructions or requirements
4. Add materials to the request:
   - Click "Add Material" or "Add Item"
   - Select a material from the dropdown
   - Enter the required quantity
   - Specify the expected delivery date (optional)
   - Add any item-specific notes
   - Repeat for all materials needed
5. Review your request
6. Click "Submit" to send for approval

The request will be routed to the appropriate approver based on your organization's workflow. You'll receive notifications about the approval status.`,
        category: 'Purchase Requests',
        keywords: ['purchase request', 'create', 'PR', 'request', 'purchase', 'order']
      },
      {
        question: 'How do I track the status of my purchase request?',
        answer: `You can track your purchase request status in several ways:

1. Purchase Request List Page:
   - Go to "Purchase Request List" from the sidebar
   - View all your requests in a table format
   - Status column shows current status:
     * Pending: Awaiting approval
     * Approved: Approved and ready for purchase order
     * Rejected: Request was rejected (check rejection reason)
     * In Progress: Purchase order has been created
     * Completed: Materials have been received

2. Purchase Request Details:
   - Click on any request to see detailed information
   - View approval history and comments
   - See which materials are included
   - Check who approved/rejected and when

3. Notifications:
   - You'll receive notifications when status changes
   - Check the bell icon in the top bar for updates

4. Filters:
   - Use status filters to view requests by status
   - Search by request number or material name

Tips:
- Save the request number for quick reference
- Check rejection reasons if your request is rejected
- Contact the approver directly if approval is delayed`,
        category: 'Purchase Requests',
        keywords: ['status', 'track', 'monitor', 'purchase request', 'approval', 'progress']
      },
      {
        question: 'What happens after a purchase request is approved?',
        answer: `Once a purchase request is approved, the following workflow occurs:

1. Approval Completion:
   - The request status changes to "Approved"
   - All approvers have reviewed and approved the request
   - You receive a notification of approval

2. Purchase Order Creation:
   - An authorized user (typically procurement team) creates a Purchase Order (PO) from the approved request
   - The PO links to your original request
   - PO number is generated for tracking

3. Vendor Communication:
   - Purchase orders are sent to selected vendors
   - Vendors confirm and process the order

4. Material Receipt:
   - When materials arrive, an "Inward" transaction is created
   - Materials are received and inspected
   - Stock levels are updated automatically

5. Request Completion:
   - Once all materials are received, the request status changes to "Completed"
   - You can view the complete history in the request details

Note: The time between approval and material receipt depends on vendor lead times and order complexity.`,
        category: 'Purchase Requests',
        keywords: ['approved', 'approval', 'purchase order', 'PO', 'next steps', 'workflow']
      },
      {
        question: 'Can I cancel or modify a purchase request after submission?',
        answer: `Modification and cancellation rules depend on the request status:

Pending Requests (Not yet approved):
- You can typically modify or cancel pending requests
- Changes may require re-approval depending on the modification type
- Contact your administrator if you need to modify/cancel

Approved Requests:
- Once approved, requests generally cannot be modified directly
- You may need to:
  1. Contact the approver to reject the request
  2. Create a new request with corrections
  3. Request cancellation through proper channels

In Progress (PO Created):
- Modification is usually not possible
- Contact procurement team for cancellation or changes
- May require vendor communication

Best Practices:
- Review your request carefully before submission
- Double-check quantities and material codes
- Add clear notes if you anticipate special requirements
- Contact support if you need urgent changes

For specific rules in your organization, check with your system administrator.`,
        category: 'Purchase Requests',
        keywords: ['cancel', 'modify', 'edit', 'change', 'delete', 'update request']
      },

      // ==================== STOCK MANAGEMENT ====================
      {
        question: 'How do I check current stock levels for materials?',
        answer: `There are multiple ways to check stock levels:

1. Stock Levels Page:
   - Navigate to "Stock Levels" from the sidebar
   - View all materials with current quantities
   - Use filters to search by material name or code
   - Sort by quantity, material name, or other criteria

2. Material Management:
   - Go to "Material Management"
   - Stock information may be displayed in the material list

3. Reports:
   - Generate inventory reports from the "Reports" section
   - Get detailed stock information by category, location, or date range

4. Quick Search:
   - Use the search functionality in the top bar
   - Search for material name or code
   - Quick stock information may be available in search results

Stock Information Displayed:
- Current Quantity: Available stock
- Reserved Quantity: Stock allocated to pending requests
- Available Quantity: Stock available for new requests
- Location/Warehouse: Where the stock is stored
- Last Updated: When the stock was last modified

Tips:
- Set up low stock alerts for critical materials
- Regularly review stock levels to avoid shortages
- Check stock levels before creating purchase requests`,
        category: 'Stock Management',
        keywords: ['stock', 'inventory', 'quantity', 'levels', 'check', 'available']
      },
      {
        question: 'How do I record material consumption or usage?',
        answer: `To record material consumption (when materials are used/consumed):

1. Navigate to "Record Consumption" from the sidebar
2. Click "Record Consumption" or "Add Consumption"
3. Fill in the consumption details:
   - Date: Select the consumption date
   - Material: Select the material being consumed
   - Quantity: Enter the amount consumed
   - Location/Area: Select where the consumption occurred
   - Purpose/Project: Enter the reason for consumption (optional)
   - Notes: Add any additional details
4. Review the details
5. Click "Submit" or "Record Consumption"

What Happens:
- Stock levels are automatically reduced
- Consumption history is recorded
- You can view consumption records in "Consumption List"
- Reports will reflect the updated stock

Important Notes:
- Ensure accurate quantities to maintain inventory accuracy
- Consumption cannot be directly reversed - use a stock adjustment if correction is needed
- All consumption records are audited and tracked

Use Cases:
- Daily operations usage
- Project-based consumption
- Material transfers between locations
- Damaged or expired material removal`,
        category: 'Stock Management',
        keywords: ['consumption', 'usage', 'use', 'consume', 'record', 'stock out']
      },
      {
        question: 'What is the difference between Inward and Stock Transfer?',
        answer: `Understanding Inward vs Stock Transfer:

INWARD:
- Purpose: Recording materials received from external sources (vendors, suppliers)
- Source: External (outside your organization)
- Common Scenarios:
  * Receiving materials from a purchase order
  * Materials delivered by vendors
  * Goods received from suppliers
- Impact: Increases total inventory in the system
- Typically requires: Purchase order reference, delivery challan, invoice

STOCK TRANSFER:
- Purpose: Moving materials between internal locations/warehouses
- Source: Internal (within your organization)
- Common Scenarios:
  * Moving stock from Warehouse A to Warehouse B
  * Transferring materials between departments
  * Redistributing inventory across locations
- Impact: Total inventory remains the same (just moved)
- Typically requires: Internal transfer request, approval

Key Differences Summary:
- Inward = Adding new stock (from outside)
- Transfer = Moving existing stock (within organization)
- Inward increases total inventory
- Transfer maintains total inventory

Both processes update stock levels and maintain complete audit trails.`,
        category: 'Stock Management',
        keywords: ['inward', 'transfer', 'stock transfer', 'receive', 'move', 'difference']
      },
      {
        question: 'How do I record an inward transaction?',
        answer: `To record materials received (Inward transaction):

1. Navigate to "Add Inward" from the sidebar
2. Fill in the inward details:
   - Inward Date: Select the date materials were received
   - Reference Number: Enter PO number, invoice number, or challan number
   - Supplier/Vendor: Select the supplier (if available in system)
   - Received By: Your name (auto-filled)
   - Location/Warehouse: Select where materials are being stored
   - Notes: Add any special notes or observations

3. Add Materials Received:
   - Click "Add Material" or "Add Item"
   - Select material from dropdown
   - Enter quantity received
   - Enter unit price (optional, for valuation)
   - Add item-specific notes if needed
   - Repeat for all materials received

4. Quality Check:
   - Verify quantities match delivery documents
   - Check material condition
   - Note any discrepancies or damages

5. Submit:
   - Review all details
   - Click "Submit" or "Record Inward"

After Submission:
- Stock levels are automatically updated
- Purchase request status may update if linked to PO
- Inward record is created for audit trail
- You can view the inward in "Inward List"

Important:
- Ensure quantities match physical receipt
- Keep delivery documents for reference
- Report discrepancies immediately`,
        category: 'Stock Management',
        keywords: ['inward', 'receive', 'receipt', 'goods received', 'GRN', 'delivery']
      },
      {
        question: 'How do I transfer stock between locations?',
        answer: `To transfer stock from one location to another:

1. Navigate to "Stock Transfer" from the sidebar
2. Click "Create Transfer" or "New Transfer"
3. Fill in transfer details:
   - Transfer Date: Select transfer date
   - From Location: Select source warehouse/location
   - To Location: Select destination warehouse/location
   - Transfer Type: Select reason (e.g., Redistribution, Emergency, Regular)
   - Requested By: Your name (auto-filled)
   - Notes: Add any special instructions

4. Add Materials to Transfer:
   - Click "Add Material"
   - Select material from available stock in source location
   - Enter transfer quantity
   - Verify available quantity is sufficient
   - Add notes if needed
   - Repeat for all materials

5. Review and Submit:
   - Verify all details are correct
   - Check that source location has sufficient stock
   - Click "Submit" for approval (if required) or "Transfer" to execute

After Transfer:
- Stock is deducted from source location
- Stock is added to destination location
- Transfer record is created
- Both locations' stock levels update immediately

Important Notes:
- Ensure sufficient stock exists in source location
- Transfers may require approval depending on settings
- Physical transfer should match system transfer
- Update system if physical transfer differs`,
        category: 'Stock Management',
        keywords: ['transfer', 'stock transfer', 'move', 'relocate', 'location', 'warehouse']
      },
      {
        question: 'How do I return stock to suppliers or vendors?',
        answer: `To return stock to suppliers/vendors:

1. Navigate to "Return Stock" from the sidebar
2. Click "Create Return" or "Return Stock"
3. Fill in return details:
   - Return Date: Select the return date
   - Supplier/Vendor: Select the supplier
   - Original Invoice/PO: Reference the original purchase document
   - Reason for Return: Select reason (e.g., Defective, Excess, Wrong Item, Quality Issue)
   - Returned By: Your name (auto-filled)
   - Notes: Add details about the return

4. Add Materials to Return:
   - Click "Add Material"
   - Select material to return
   - Enter return quantity
   - Verify available stock
   - Add item-specific return reason if different

5. Review and Submit:
   - Verify all details
   - Ensure quantities are correct
   - Click "Submit" or "Return"

After Return:
- Stock is deducted from your inventory
- Return record is created for tracking
- Stock levels update immediately
- Return can be linked to credit note or refund

Important:
- Return only what was physically sent back
- Maintain return documents (RMA, return challan)
- Coordinate with accounts for credit/refund
- Update system if return status changes

Use Cases:
- Defective materials
- Excess quantities received
- Wrong items delivered
- Quality issues`,
        category: 'Stock Management',
        keywords: ['return', 'return stock', 'vendor return', 'supplier return', 'RMA']
      },

      // ==================== REPORTS & ANALYTICS ====================
      {
        question: 'How do I generate inventory reports?',
        answer: `To generate inventory reports:

1. Navigate to "Reports" from the sidebar
2. Select the type of report you need:
   - Stock Level Report: Current inventory levels
   - Stock Movement Report: Inward/outward transactions
   - Consumption Report: Material usage over time
   - Purchase Request Report: Request status and history
   - Stock Transfer Report: Inter-location transfers
   - Low Stock Report: Materials below threshold
   - Valuation Report: Inventory value by material

3. Set Report Parameters:
   - Date Range: Select start and end dates
   - Material Category: Filter by material type
   - Location/Warehouse: Filter by location
   - Status: Filter by transaction status (if applicable)

4. Generate Report:
   - Click "Generate Report" or "Export"
   - View report on screen
   - Export to PDF or Excel if needed

5. Schedule Reports (if available):
   - Set up automated reports
   - Choose frequency (daily, weekly, monthly)
   - Select recipients

Report Features:
- Filter by multiple criteria
- Export to various formats
- Print functionality
- Email reports
- Historical data access

Tips:
- Use date ranges wisely for performance
- Export large reports instead of viewing online
- Save frequently used report parameters
- Schedule regular reports for management`,
        category: 'Reports & Analytics',
        keywords: ['report', 'generate', 'export', 'analytics', 'data', 'statistics']
      },
      {
        question: 'What reports are available in the system?',
        answer: `The system provides various reports for inventory management:

STOCK REPORTS:
- Stock Level Report: Current quantities by material and location
- Stock Valuation Report: Inventory value and cost analysis
- Low Stock Alert Report: Materials below reorder level
- Stock Movement Report: All inward/outward transactions
- Stock Aging Report: Inventory aging analysis

TRANSACTION REPORTS:
- Purchase Request Report: All PRs with status and details
- Purchase Order Report: PO status and vendor information
- Inward Report: All inward transactions and receipts
- Consumption Report: Material usage patterns
- Return Report: Stock returns to suppliers

LOCATION REPORTS:
- Location-wise Stock Report: Inventory by warehouse/location
- Stock Transfer Report: Inter-location transfers
- Location Utilization Report: Space and capacity analysis

ANALYTICAL REPORTS:
- Material Usage Trends: Consumption patterns over time
- Vendor Performance Report: Supplier delivery and quality metrics
- Cost Analysis Report: Material costs and price trends
- ABC Analysis: High/medium/low value material classification

CUSTOM REPORTS:
- Create custom reports with selected fields
- Save report templates for reuse
- Schedule automated report generation

Access reports through the "Reports" menu. Contact your administrator if you need additional report types.`,
        category: 'Reports & Analytics',
        keywords: ['reports', 'available', 'types', 'list', 'analytics', 'data']
      },

      // ==================== USER MANAGEMENT & PERMISSIONS ====================
      {
        question: 'How do user roles and permissions work?',
        answer: `The system uses role-based access control for security:

ROLE TYPES:
1. Admin:
   - Full system access
   - User management
   - System configuration
   - All reports and data

2. Manager/Supervisor:
   - Approve requests
   - View team data
   - Generate reports
   - Stock management

3. User/Operator:
   - Create requests
   - View own data
   - Limited stock operations
   - Basic reports

4. Store Keeper:
   - Stock operations (inward/outward)
   - Stock transfers
   - Stock level updates
   - Location management

PERMISSIONS CONTROL:
- Page-level permissions: Access to specific pages
- Action permissions: Create, edit, delete, approve
- Data permissions: View own, view team, view all
- Location permissions: Access to specific warehouses

CHECKING YOUR PERMISSIONS:
- Contact your system administrator
- Check the "Page Permissions" page (if accessible)
- Some pages may be hidden based on permissions

REQUESTING ACCESS:
- Contact your administrator or IT support
- Specify which pages or functions you need
- Your role will be updated after approval

Best Practices:
- Only request access you actually need
- Follow principle of least privilege
- Report any permission issues immediately
- Don't share your login credentials`,
        category: 'User Management',
        keywords: ['permissions', 'roles', 'access', 'rights', 'authorization', 'admin']
      },
      {
        question: 'How do I update my profile information?',
        answer: `To update your profile:

1. Click on your profile/user icon in the top right corner
2. Select "Profile" or "Settings" from the dropdown
3. Update the information you need to change:
   - Name
   - Email address
   - Phone number
   - Department
   - Profile picture (if available)
4. Click "Save" to update

IMPORTANT NOTES:
- Some fields may be restricted and require administrator approval
- Email changes may require verification
- Contact your administrator if you can't update certain fields
- Password changes are typically in a separate "Change Password" section

If you don't see a profile option:
- Contact your system administrator
- Some organizations manage profiles centrally
- Your HR or IT department may need to update certain information`,
        category: 'User Management',
        keywords: ['profile', 'update', 'edit', 'settings', 'account', 'information']
      },

      // ==================== GENERAL SYSTEM ====================
      {
        question: 'How do I search for materials, requests, or transactions?',
        answer: `The system provides multiple search options:

1. GLOBAL SEARCH (Top Bar):
   - Click the search icon in the top navigation bar
   - Type your search query
   - Results show across materials, requests, transactions
   - Click any result to navigate directly

2. PAGE-SPECIFIC SEARCH:
   - Most list pages have a search box
   - Enter material name, code, or relevant keywords
   - Results filter in real-time

3. FILTERS:
   - Use filter dropdowns on list pages
   - Filter by:
     * Status (Pending, Approved, etc.)
     * Date range
     * Category/Type
     * Location
     * Department

4. ADVANCED SEARCH:
   - Some pages offer advanced search options
   - Combine multiple criteria
   - Save search filters for reuse

SEARCH TIPS:
- Use material codes for exact matches
- Partial names work (e.g., "cable" finds "Network Cable")
- Search is case-insensitive
- Use filters to narrow results
- Clear filters to reset search

If you can't find something:
- Check spelling
- Try different keywords
- Remove filters
- Contact support if data should exist`,
        category: 'General',
        keywords: ['search', 'find', 'filter', 'lookup', 'query']
      },
      {
        question: 'How do I print documents or reports?',
        answer: `To print documents and reports:

1. GENERATING PRINTABLE VIEW:
   - Navigate to the document/report you want to print
   - Look for a "Print" button or icon
   - Click to open print preview

2. PRINT PREVIEW:
   - Review the document layout
   - Check page breaks
   - Ensure all information is visible

3. PRINT OPTIONS:
   - Use browser's print dialog (Ctrl+P / Cmd+P)
   - Select your printer
   - Choose page range if needed
   - Adjust settings (orientation, margins, scale)

4. EXPORT AND PRINT:
   - Export to PDF first for better control
   - Open PDF and print from PDF viewer
   - This preserves formatting better

AVAILABLE PRINTABLE DOCUMENTS:
- Purchase Requests
- Purchase Orders
- Inward Receipts
- Stock Reports
- Transaction Reports
- Material Lists

TIPS:
- Use "Export to PDF" for important documents
- Check printer settings before printing
- Print in landscape for wide reports
- Save PDFs for digital records
- Some documents may have "Print" buttons that format automatically

For bulk printing or special formats, contact your administrator.`,
        category: 'General',
        keywords: ['print', 'export', 'PDF', 'document', 'hardcopy']
      },
      {
        question: 'What should I do if I see an error message?',
        answer: `When you encounter an error:

1. READ THE ERROR MESSAGE:
   - Note the exact error text
   - Check for error codes
   - Look for specific field or action mentioned

2. COMMON ERRORS AND SOLUTIONS:

   Validation Error:
   - Check required fields are filled
   - Verify data format (dates, numbers)
   - Ensure unique constraints (like product codes)

   Permission Error:
   - You may not have access to that function
   - Contact administrator for access
   - Try logging out and back in

   Network/Connection Error:
   - Check your internet connection
   - Refresh the page
   - Try again after a moment

   Not Found Error:
   - The record may have been deleted
   - Check if you have access
   - Verify the ID or code is correct

3. TAKE SCREENSHOTS:
   - Capture the error message
   - Note what you were doing when it occurred
   - Save for troubleshooting

4. REPORT THE ERROR:
   - Contact IT support or administrator
   - Provide:
     * Error message (screenshot)
     * Steps to reproduce
     * Browser and device information
     * Time when error occurred

5. TRY ALTERNATIVE:
   - Try the action again
   - Use a different browser
   - Clear browser cache
   - Check if others are experiencing same issue

For urgent issues, contact your system administrator immediately.`,
        category: 'General',
        keywords: ['error', 'troubleshoot', 'problem', 'issue', 'help', 'support']
      },
      {
        question: 'How do I get help or contact support?',
        answer: `Multiple ways to get help:

1. FAQ SYSTEM (You're here!):
   - Browse FAQs in this section
   - Search for your question
   - Click FAQs to see detailed answers
   - Rate FAQs helpful/not helpful

2. CHAT SUPPORT:
   - Click "Chat" tab in this window
   - Start a conversation with admin
   - Get real-time assistance
   - Chat history is saved

3. CONTACT ADMINISTRATOR:
   - Email your system administrator
   - Contact IT support desk
   - Reach out to your supervisor

4. SYSTEM DOCUMENTATION:
   - Check user manuals (if available)
   - Review training materials
   - Access help documentation

5. IN-APP FEATURES:
   - Use tooltips (hover over icons/fields)
   - Check field labels and hints
   - Look for help icons on pages

WHAT TO INCLUDE WHEN REACHING OUT:
- Clear description of your question or issue
- Steps you've already tried
- Screenshots if applicable
- Your user ID or name
- Page or function you're using

RESPONSE TIMES:
- Urgent issues: Contact directly
- General questions: Within business hours
- Complex issues: May take longer for resolution

Remember: The FAQ system and chat support are available 24/7 for self-service help!`,
        category: 'General',
        keywords: ['help', 'support', 'contact', 'assistance', 'admin', 'FAQ']
      }
    ];

    console.log(`📝 Seeding ${faqs.length} FAQs...\n`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const faq of faqs) {
      // Check if FAQ with same question already exists
      const existing = await FAQ.findOne({
        where: {
          question: faq.question
        }
      });

      if (existing) {
        skippedCount++;
        console.log(`   ℹ️  FAQ already exists: "${faq.question.substring(0, 50)}..."`);
      } else {
        await FAQ.create({
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
          keywords: faq.keywords,
          is_active: true,
          view_count: 0,
          helpful_count: 0,
          not_helpful_count: 0
        });
        createdCount++;
        console.log(`   ✅ Created FAQ: "${faq.question.substring(0, 50)}..."`);
      }
    }

    console.log(`\n📊 Seeding Summary:`);
    console.log(`   ✅ Created: ${createdCount} FAQs`);
    console.log(`   ℹ️  Skipped: ${skippedCount} FAQs (already exist)`);
    console.log(`   📝 Total: ${faqs.length} FAQs processed\n`);

    console.log('✅ FAQ seeding completed successfully!\n');

  } catch (error) {
    console.error('❌ Error seeding FAQs:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
};

// Run the seed function
seedFAQs()
  .then(() => {
    console.log('🎉 Seeding process finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });

export default seedFAQs;

