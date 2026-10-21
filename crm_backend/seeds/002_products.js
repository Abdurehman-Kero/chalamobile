// All 33 real products from owner_prototype/products.html
exports.seed = async (knex) => {
  const isPg = knex.client.config.client === 'pg' || knex.client.config.client === 'postgresql' || knex.client.driverName === 'pg';
  if (isPg) {
    await knex.raw('TRUNCATE TABLE product_images, products CASCADE');
  } else {
    await knex('product_images').del();
    await knex('products').del();
  }

  await knex('products').insert([
    // Laptops/PC
    { name:'HP Laptop', brand:'HP', category:'Laptops', specs:'500GB 8RAM', storage_gb:500, ram_gb:8, selling_price:9000, cost_price:7500, stock:5, is_published:true, emoji:'💻' },
    // Samsung phones
    { name:'Samsung A15', brand:'Samsung', category:'Smartphones', specs:'128+4GB', storage_gb:128, ram_gb:4, selling_price:15000, cost_price:12000, stock:14, is_published:true, emoji:'📱' },
    { name:'Samsung M14', brand:'Samsung', category:'Smartphones', specs:'64+4GB', storage_gb:64, ram_gb:4, selling_price:17500, cost_price:14500, stock:8, is_published:true, emoji:'📱' },
    { name:'Samsung A13', brand:'Samsung', category:'Smartphones', specs:'64+4GB', storage_gb:64, ram_gb:4, selling_price:7000, cost_price:5500, stock:11, is_published:true, emoji:'📱' },
    { name:'Samsung S23 FE', brand:'Samsung', category:'Smartphones', specs:'128+8GB', storage_gb:128, ram_gb:8, selling_price:50000, cost_price:44000, stock:2, is_published:true, emoji:'📱' },
    { name:'Samsung A73', brand:'Samsung', category:'Smartphones', specs:'128+6GB', storage_gb:128, ram_gb:6, selling_price:23000, cost_price:19000, stock:4, is_published:true, emoji:'📱' },
    { name:'Samsung A26 5G', brand:'Samsung', category:'Smartphones', specs:'128+6GB', storage_gb:128, ram_gb:6, selling_price:32000, cost_price:28000, stock:6, is_published:true, emoji:'📱' },
    { name:'Samsung A07 (Kam)', brand:'Samsung', category:'Smartphones', specs:'128+4GB', storage_gb:128, ram_gb:4, selling_price:22500, cost_price:19000, stock:7, notes:'Kamal', is_published:true, emoji:'📱' },
    { name:'Samsung A06 (Dha)', brand:'Samsung', category:'Smartphones', specs:'64+4GB', storage_gb:64, ram_gb:4, selling_price:14500, cost_price:12000, stock:9, notes:'Dhahabo', is_published:true, emoji:'📱' },
    { name:'Samsung A07 (Kam2)', brand:'Samsung', category:'Smartphones', specs:'64+4GB', storage_gb:64, ram_gb:4, selling_price:20000, cost_price:17000, stock:5, notes:'Kamal', is_published:true, emoji:'📱' },
    { name:'Samsung A06 (Kam)', brand:'Samsung', category:'Smartphones', specs:'64+4GB', storage_gb:64, ram_gb:4, selling_price:17500, cost_price:14500, stock:6, notes:'Kamal', is_published:true, emoji:'📱' },
    { name:'Samsung A06 (Adii)', brand:'Samsung', category:'Smartphones', specs:'64+4GB', storage_gb:64, ram_gb:4, selling_price:15500, cost_price:13000, stock:4, notes:'Adiim', is_published:true, emoji:'📱' },
    // M-Horse
    { name:'M-Horse', brand:'M-Horse', category:'Smartphones', specs:'128+8GB', storage_gb:128, ram_gb:8, selling_price:17000, cost_price:14000, stock:3, is_published:true, emoji:'📱' },
    // Corn
    { name:'Corn³G', brand:'Corn', category:'Smartphones', specs:'64+4GB', storage_gb:64, ram_gb:4, selling_price:15000, cost_price:12500, stock:5, is_published:true, emoji:'📱' },
    // WiFi
    { name:'Highlink 5G WiFi', brand:'Highlink', category:'WiFi Routers', specs:'5G Router', selling_price:4500, cost_price:3500, stock:22, is_published:true, emoji:'📶' },
    { name:'Safaricom 4G WiFi', brand:'Safaricom', category:'WiFi Routers', specs:'4G Router', selling_price:4000, cost_price:3200, stock:15, is_published:true, emoji:'📶' },
    { name:'Ethio Tel WiFi', brand:'Ethio Tel', category:'WiFi Routers', specs:'4G Modem', selling_price:4000, cost_price:3200, stock:10, is_published:true, emoji:'📶' },
    // iPhone
    { name:'iPhone 11', brand:'Apple', category:'Smartphones', specs:'64GB', storage_gb:64, selling_price:11300, cost_price:9500, stock:1, is_published:true, emoji:'🍎' },
    // Tecno
    { name:'Tecno Pop 20', brand:'Tecno', category:'Smartphones', specs:'64+4GB', storage_gb:64, ram_gb:4, selling_price:18500, cost_price:15500, stock:8, is_published:true, emoji:'📱' },
    { name:'Tecno Camon 50', brand:'Tecno', category:'Smartphones', specs:'256+8GB', storage_gb:256, ram_gb:8, selling_price:60000, cost_price:53000, stock:2, is_published:true, emoji:'📱' },
    // Infinix
    { name:'Infinix Hot 12', brand:'Infinix', category:'Smartphones', specs:'64+4GB', storage_gb:64, ram_gb:4, selling_price:14000, cost_price:11500, stock:7, is_published:true, emoji:'📱' },
    { name:'Infinix Smart 7', brand:'Infinix', category:'Smartphones', specs:'64+2GB', storage_gb:64, ram_gb:2, selling_price:12000, cost_price:9500, stock:10, is_published:true, emoji:'📱' },
    // Accessories
    { name:'Samsung 45W Charger', brand:'Samsung', category:'Accessories', specs:'Type-C 45W', selling_price:600, cost_price:400, stock:30, is_published:true, emoji:'🔌' },
    { name:'Smart Watch', brand:'Digital', category:'Accessories', specs:'Fitness Tracker', selling_price:5000, cost_price:3500, stock:12, is_published:true, emoji:'⌚' },
    { name:'Veger Powerbank 20000', brand:'Veger', category:'Accessories', specs:'20000mAh', selling_price:2200, cost_price:1700, stock:2, is_published:true, emoji:'🔋' },
    { name:'Earpods', brand:'Generic', category:'Accessories', specs:'3.5mm', selling_price:350, cost_price:200, stock:40, is_published:true, emoji:'🎧' },
    { name:'Phone Case Samsung A15', brand:'Generic', category:'Accessories', specs:'Silicone', selling_price:200, cost_price:100, stock:25, is_published:true, emoji:'📦' },
    { name:'Screen Protector', brand:'Generic', category:'Accessories', specs:'9H Tempered Glass', selling_price:150, cost_price:80, stock:50, is_published:true, emoji:'🔲' },
  ]);
};
