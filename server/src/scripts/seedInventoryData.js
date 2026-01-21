import Company from '../models/Company.js';
import AssetType from '../models/AssetType.js';
import Asset from '../models/Asset.js';
import sequelize from '../config/database.js';

/**
 * Seed initial inventory data
 * Run this script to populate companies, asset types, and sample assets
 */

const seedData = async () => {
  try {
    console.log('🌱 Starting inventory data seeding...');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Create tables if they don't exist
    await Company.sync({ alter: false });
    await AssetType.sync({ alter: false });
    await Asset.sync({ alter: false });
    console.log('✅ Tables synchronized');

    // ==================== SEED COMPANIES ====================
    console.log('\n📊 Seeding companies...');
    
    const companies = [
      { company_code: 'EXPL', company_name: 'Example Ltd.' },
      { company_code: 'EXP', company_name: 'Express Inc.' },
      { company_code: 'GFN', company_name: 'Good Fortune Networks' },
    ];

    for (const company of companies) {
      const [record, created] = await Company.findOrCreate({
        where: { company_code: company.company_code },
        defaults: {
          company_name: company.company_name,
          is_active: true
        }
      });
      
      if (created) {
        console.log(`   ✅ Created company: ${company.company_code} - ${company.company_name}`);
      } else {
        console.log(`   ℹ️  Company already exists: ${company.company_code}`);
      }
    }

    // ==================== SEED ASSET TYPES ====================
    console.log('\n📦 Seeding asset types...');
    
    const assetTypes = [
      { type_code: 'BANNER', type_name: 'Banner', description: 'Marketing banners for events and promotions' },
      { type_code: 'FLYER', type_name: 'Flyer', description: 'Promotional flyers and leaflets' },
      { type_code: 'BOARD', type_name: 'Board', description: 'Display boards and signage' },
      { type_code: 'CAP', type_name: 'Cap', description: 'Branded caps and hats' },
      { type_code: 'OTHERS', type_name: 'Others', description: 'Miscellaneous promotional items' },
    ];

    for (const assetType of assetTypes) {
      const [record, created] = await AssetType.findOrCreate({
        where: { type_code: assetType.type_code },
        defaults: {
          type_name: assetType.type_name,
          description: assetType.description,
          is_active: true
        }
      });
      
      if (created) {
        console.log(`   ✅ Created asset type: ${assetType.type_code} - ${assetType.type_name}`);
      } else {
        console.log(`   ℹ️  Asset type already exists: ${assetType.type_code}`);
      }
    }

    // ==================== SEED SAMPLE ASSETS ====================
    console.log('\n📋 Seeding sample assets...');
    
    const sampleAssets = [
      { asset_type: 'Banner', company: 'EXPL', total_in: 120, total_out: 40, threshold: 30 },
      { asset_type: 'Flyer', company: 'EXP', total_in: 500, total_out: 480, threshold: 50 },
      { asset_type: 'Board', company: 'EXPL', total_in: 25, total_out: 10, threshold: 10 },
      { asset_type: 'Others', company: 'GFN', total_in: 40, total_out: 38, threshold: 10 },
      { asset_type: 'Cap', company: 'EXPL', total_in: 60, total_out: 15, threshold: 20 },
    ];

    for (const asset of sampleAssets) {
      const balance = asset.total_in - asset.total_out;
      const [record, created] = await Asset.findOrCreate({
        where: { 
          asset_type: asset.asset_type,
          company: asset.company 
        },
        defaults: {
          total_in: asset.total_in,
          total_out: asset.total_out,
          balance: balance,
          threshold: asset.threshold,
          is_active: true
        }
      });
      
      if (created) {
        const status = balance <= asset.threshold ? '⚠️  LOW STOCK' : '✅ Healthy';
        console.log(`   ✅ Created asset: ${asset.asset_type} (${asset.company}) - Balance: ${balance} ${status}`);
      } else {
        console.log(`   ℹ️  Asset already exists: ${asset.asset_type} (${asset.company})`);
      }
    }

    // ==================== SUMMARY ====================
    const totalCompanies = await Company.count({ where: { is_active: true } });
    const totalAssetTypes = await AssetType.count({ where: { is_active: true } });
    const totalAssets = await Asset.count({ where: { is_active: true } });
    const lowStockCount = await Asset.count({ 
      where: { 
        is_active: true,
        balance: { [sequelize.Sequelize.Op.lte]: sequelize.Sequelize.col('threshold') }
      } 
    });

    console.log('\n' + '='.repeat(60));
    console.log('📊 SEEDING SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Total Companies: ${totalCompanies}`);
    console.log(`✅ Total Asset Types: ${totalAssetTypes}`);
    console.log(`✅ Total Assets: ${totalAssets}`);
    console.log(`⚠️  Low Stock Assets: ${lowStockCount}`);
    console.log('='.repeat(60));
    console.log('\n✅ Seeding completed successfully!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

// Run the seed function
seedData();

