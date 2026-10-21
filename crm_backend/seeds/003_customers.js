const { shouldSeed } = require('../src/db/seedGuard');
// Sample customers from owner_prototype/customers.html
exports.seed = async (knex) => {
  if (!(await shouldSeed(knex, 'customers'))) return;
  await knex('customers').insert([
    { name:'Ahmed Musa',  phone:'0911 233 445', total_spent:36000, buy_count:3, is_vip:true },
    { name:'Qasim Ali',   phone:'0922 334 455', total_spent:11300, buy_count:1, is_vip:false },
    { name:'Sara Tapas',  phone:'0933 556 677', total_spent:39000, buy_count:2, is_vip:true },
    { name:'Kamal Biru',  phone:'0944 667 788', total_spent:62000, buy_count:4, is_vip:true },
    { name:'Norbert E.',  phone:'0955 778 899', total_spent:12000, buy_count:1, is_vip:false },
    { name:'Adiim H.',    phone:'0966 889 900', total_spent:15500, buy_count:1, is_vip:false },
    { name:'Musa T.',     phone:'0977 990 011', total_spent:34500, buy_count:2, is_vip:true },
    { name:'Tasha B.',    phone:'0988 001 122', total_spent:30000, buy_count:1, is_vip:false },
    { name:'Gurgurame',   phone:'0999 112 233', total_spent:22500, buy_count:1, is_vip:false },
    { name:'Ashar M.',    phone:'0900 223 344', total_spent:16000, buy_count:1, is_vip:false },
  ]);
};
