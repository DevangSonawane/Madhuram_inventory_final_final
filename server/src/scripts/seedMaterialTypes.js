import MaterialType from '../models/MaterialType.js';
import sequelize from '../config/database.js';

/**
 * Seed initial material types
 * Run this script to populate material types in the database
 */

const seedMaterialTypes = async () => {
  try {
    console.log('🌱 Starting material types seeding...');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Sync table
    await MaterialType.sync({ alter: false });
    console.log('✅ Material types table synchronized');

    // ==================== SEED MATERIAL TYPES ====================
    console.log('\n📊 Seeding material types...');
    
    // List of existing material types that should be in the database
    const materialTypes = [
      { typeName: 'components', typeCode: 'COMP', description: 'Component materials' },
      { typeName: 'raw material', typeCode: 'RAW', description: 'Raw materials' },
      { typeName: 'finish product', typeCode: 'FIN', description: 'Finished products' },
      { typeName: 'supportive material', typeCode: 'SUP', description: 'Supportive materials' },
      { typeName: 'cable', typeCode: 'CAB', description: 'Cable materials' },
      // Also add uppercase versions if used elsewhere
      { typeName: 'COMPONENT', typeCode: 'COMP', description: 'Component materials' },
      { typeName: 'RAW_MATERIAL', typeCode: 'RAW', description: 'Raw materials' },
      { typeName: 'FINISH_PRODUCT', typeCode: 'FIN', description: 'Finished products' },
      { typeName: 'SUPPORTING_MATERIAL', typeCode: 'SUP', description: 'Supporting materials' },
      { typeName: 'CABLE', typeCode: 'CAB', description: 'Cable materials' },
    ];

    for (const materialType of materialTypes) {
      // Check if it exists (case-insensitive for type_name within same org)
      const existing = await MaterialType.findOne({
        where: {
          type_name: materialType.typeName,
          org_id: null, // For global material types
          is_active: true
        }
      });

      if (!existing) {
        await MaterialType.create({
          type_name: materialType.typeName,
          type_code: materialType.typeCode,
          description: materialType.description,
          org_id: null, // Global material types
          is_active: true
        });
        console.log(`   ✅ Created material type: ${materialType.typeName}`);
      } else {
        console.log(`   ℹ️  Material type already exists: ${materialType.typeName}`);
      }
    }

    console.log('\n✅ Material types seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding material types:', error);
    process.exit(1);
  }
};

seedMaterialTypes();

