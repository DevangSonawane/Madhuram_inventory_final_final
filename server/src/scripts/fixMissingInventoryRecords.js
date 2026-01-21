import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Fix missing inventory_master records for completed inward entries
 * This script creates inventory_master records for inward items that should have them
 * but don't (due to bugs or data migration issues)
 */
const fixMissingInventoryRecords = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    // Find all completed inward entries with items that don't have inventory_master records
    const missingRecords = await sequelize.query(`
      SELECT 
        ie.inward_id,
        ie.stock_area_id,
        ie.org_id,
        ii.item_id,
        ii.material_id,
        ii.quantity,
        ii.serial_number,
        ii.mac_id,
        m.material_type,
        COUNT(im.id) as existing_count
      FROM inward_entries ie
      INNER JOIN inward_items ii ON ie.inward_id = ii.inward_id
      LEFT JOIN materials m ON ii.material_id = m.material_id
      LEFT JOIN inventory_master im ON im.inward_item_id = ii.item_id AND im.is_active = true
      WHERE ie.status = 'COMPLETED'
        AND ie.is_active = true
      GROUP BY ie.inward_id, ie.stock_area_id, ie.org_id, ii.item_id, ii.material_id, ii.quantity, ii.serial_number, ii.mac_id, m.material_type
      HAVING existing_count < ii.quantity
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`Found ${missingRecords.length} inward items with missing inventory records`);

    if (missingRecords.length === 0) {
      console.log('No missing records found. All good!');
      await sequelize.close();
      return;
    }

    const transaction = await sequelize.transaction();

    try {
      let totalCreated = 0;

      for (const record of missingRecords) {
        const {
          inward_id,
          stock_area_id,
          org_id,
          item_id,
          material_id,
          quantity,
          serial_number,
          mac_id,
          material_type,
          existing_count
        } = record;

        const recordsToCreate = parseInt(quantity) - parseInt(existing_count);

        console.log(`\nProcessing inward_item ${item_id}:`);
        console.log(`  Material: ${material_id}`);
        console.log(`  Quantity: ${quantity}, Existing: ${existing_count}, To Create: ${recordsToCreate}`);

        if (serial_number || mac_id) {
          // Serialized item - should have exactly 1 record
          if (parseInt(existing_count) === 0) {
            await sequelize.query(`
              INSERT INTO inventory_master (
                id, material_id, serial_number, mac_id, 
                current_location_type, location_id, status, 
                inward_item_id, org_id, is_active, created_at, updated_at
              ) VALUES (?, ?, ?, ?, 'WAREHOUSE', ?, 'AVAILABLE', ?, ?, TRUE, NOW(), NOW())
            `, {
              replacements: [
                uuidv4(),
                material_id,
                serial_number || null,
                mac_id || null,
                stock_area_id,
                item_id,
                org_id
              ],
              transaction
            });
            totalCreated++;
            console.log(`  ✓ Created 1 serialized inventory record`);
          }
        } else {
          // Bulk item - create one record per unit
          for (let i = 0; i < recordsToCreate; i++) {
            await sequelize.query(`
              INSERT INTO inventory_master (
                id, material_id, serial_number, mac_id, 
                current_location_type, location_id, status, 
                inward_item_id, org_id, is_active, created_at, updated_at
              ) VALUES (?, ?, NULL, NULL, 'WAREHOUSE', ?, 'AVAILABLE', ?, ?, TRUE, NOW(), NOW())
            `, {
              replacements: [
                uuidv4(),
                material_id,
                stock_area_id,
                item_id,
                org_id
              ],
              transaction
            });
            totalCreated++;
          }
          console.log(`  ✓ Created ${recordsToCreate} bulk inventory records`);
        }
      }

      await transaction.commit();
      console.log(`\n✅ Successfully created ${totalCreated} inventory_master records`);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    await sequelize.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error fixing missing inventory records:', error);
    throw error;
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixMissingInventoryRecords()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export default fixMissingInventoryRecords;

