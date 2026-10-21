const { shouldSeed } = require('../src/db/seedGuard');
// Sample repair tickets from owner_prototype/repairs.html
exports.seed = async (knex) => {
  if (!(await shouldSeed(knex, 'repairs'))) return;
  await knex('repairs').insert([
    { ticket_number:'REP-1023', device_name:'Samsung Galaxy A06', issue:'Screen cracked, not displaying', customer_name:'Ahmed Musa', customer_phone:'0911 233 445', status:'fixing', status_step:3, estimated_cost:2500, received_at: new Date(Date.now() - 2*86400000) },
    { ticket_number:'REP-1024', device_name:'iPhone 11', issue:'Battery draining fast', customer_name:'Qasim Ali', customer_phone:'0922 334 455', status:'diagnosing', status_step:2, estimated_cost:1800, received_at: new Date(Date.now() - 86400000) },
    { ticket_number:'REP-1025', device_name:'Tecno Pop 20', issue:'Charging port damaged', customer_name:'Sara Tapas', customer_phone:'0933 556 677', status:'received', status_step:1, estimated_cost:800, received_at: new Date() },
    { ticket_number:'REP-1020', device_name:'Samsung A15', issue:'Back camera not working', customer_name:'Kamal Biru', customer_phone:'0944 667 788', status:'completed', status_step:4, estimated_cost:1500, actual_cost:1400, received_at: new Date(Date.now() - 5*86400000), completed_at: new Date() },
    { ticket_number:'REP-1019', device_name:'Infinix Hot 12', issue:'Speaker no sound', customer_name:'Norbert E.', customer_phone:'0955 778 899', status:'delivered', status_step:5, actual_cost:700, received_at: new Date(Date.now() - 7*86400000), completed_at: new Date(Date.now() - 2*86400000), delivered_at: new Date() },
  ]);
};
