// End-to-end check of the web store API and the order flow. Needs a running server and a
// freshly seeded database:  node tests/storefront-flow.mjs   (edit B below for the port; the test customer is created automatically).
const B='http://localhost:3055/api';
const j=async(p,o={})=>{const r=await fetch(B+p,{...o,headers:{'content-type':'application/json',...(o.headers||{})},body:o.body?JSON.stringify(o.body):undefined});let b=null;try{b=await r.json()}catch{}return {s:r.status,b}};
const ok=(n,c,x)=>console.log(c?'PASS':'FAIL',n,c?'':JSON.stringify(x));
const login=await j('/auth/login',{method:'POST',body:{email:'admin@chalamobile.com',password:'admin123'}});
const staff={authorization:'Bearer '+login.b.token};
// The test customer is created on the first run and signed in on later runs.
await j('/public/auth/register',{method:'POST',body:{name:'Test Buyer',phone:'0911234567',password:'secret1'}});
const reg=await j('/public/auth/login',{method:'POST',body:{phone:'0911234567',password:'secret1'}});
const shop={authorization:'Bearer '+reg.b.token};
// token isolation
ok('shop token rejected on staff /products',(await j('/products',{headers:shop})).s===401);
ok('staff token rejected on shop /orders',(await j('/public/orders',{headers:staff})).s===401);
ok('no token -> 401',(await j('/public/orders')).s===401);
// order w/ tampered price & bad qty
const prod=(await j('/public/products/5')).b.product;
let r=await j('/public/orders',{method:'POST',headers:shop,body:{items:[{product_id:5,qty:1,unit_price:1}],name:'T B',phone:'0911234567',delivery_method:'pickup',payment_method:'cash'}});ok('client price rejected',r.s===400,r);
r=await j('/public/orders',{method:'POST',headers:{...shop,'idempotency-key':'k1'},body:{items:[{product_id:5,qty:1}],name:'Test Buyer',phone:'0911234567',delivery_method:'delivery',address:'Bole, Addis Ababa',payment_method:'telebirr'}});
ok('order created',r.s===201,r); ok('price from DB',r.b.order?.total===prod.price,r.b);
const oid=r.b.order.id;
const r2=await j('/public/orders',{method:'POST',headers:{...shop,'idempotency-key':'k1'},body:{items:[{product_id:5,qty:1}],name:'Test Buyer',phone:'0911234567',delivery_method:'delivery',address:'Bole, Addis Ababa',payment_method:'telebirr'}});
ok('idempotent replay same order',r2.s===200&&r2.b.order.id===oid,r2);
r=await j('/public/orders',{method:'POST',headers:shop,body:{items:[{product_id:5,qty:99}],name:'T B',phone:'0911234567',delivery_method:'pickup',payment_method:'cash'}});
ok('qty>10 rejected',r.s===400,r);
r=await j('/public/orders',{method:'POST',headers:shop,body:{items:[{product_id:5,qty:5}],name:'T B',phone:'0911234567',delivery_method:'pickup',payment_method:'cash'}});
ok('over stock rejected',r.s===400&&/left/.test(r.b.error),r);
r=await j('/public/orders',{method:'POST',headers:shop,body:{items:[{product_id:5,qty:1}],name:'T B',phone:'0911234567',delivery_method:'delivery',payment_method:'cash'}});
ok('delivery needs address',r.s===400,r);
// unpublished hidden
const all=(await j('/products',{headers:staff})).b.products; const p1=all.find(p=>p.id===1);
await j('/products/1',{method:'PUT',headers:staff,body:{is_published:false}});
ok('unpublished 404',(await j('/public/products/1')).s===404);
r=await j('/public/orders',{method:'POST',headers:shop,body:{items:[{product_id:1,qty:1}],name:'T B',phone:'0911234567',delivery_method:'pickup',payment_method:'cash'}});
ok('unpublished not orderable',r.s===400,r);
await j('/products/1',{method:'PUT',headers:staff,body:{is_published:true}});
// staff flow
const stockBefore=(await j('/products/5',{headers:staff})).b.product.stock;
ok('staff sees order',(await j('/orders',{headers:staff})).b.pending>=1);
r=await j(`/orders/${oid}/status`,{method:'PUT',headers:staff,body:{status:'ready'}});
ok('pending->ready blocked',r.s===400,r);
r=await j(`/orders/${oid}/status`,{method:'PUT',headers:staff,body:{status:'confirmed'}});
ok('confirm ok + sale',r.s===200&&r.b.order.sale_id,r);
const stockAfter=(await j('/products/5',{headers:staff})).b.product.stock;
ok('stock decremented',stockAfter===stockBefore-1,{stockBefore,stockAfter});
ok('cancel after confirm blocked',(await j(`/orders/${oid}/status`,{method:'PUT',headers:staff,body:{status:'cancelled'}})).s===400);
await j(`/orders/${oid}/status`,{method:'PUT',headers:staff,body:{status:'ready'}});
const n=await j('/public/notifications',{headers:shop});
ok('notifications 3 (received, confirmed, on its way)',n.b.notifications.length===3&&n.b.unread===3,n.b);
await j('/public/notifications/read',{method:'POST',headers:shop});
ok('mark read',(await j('/public/notifications',{headers:shop})).b.unread===0);
ok('my orders',(await j('/public/orders',{headers:shop})).b.orders.length===1);
// customer linked in CRM + trending
const cust=(await j('/customers',{headers:staff})).b;
ok('CRM customer created by phone',JSON.stringify(cust).includes('+251911234567'),Object.keys(cust));
const home=(await j('/public/home')).b;
ok('trending leader is sold item',home.trending[0].id===5&&home.trending[0].sold===1,home.trending[0]);
ok('no leaks anywhere',!JSON.stringify([home,(await j('/public/products/5')).b]).match(/cost_price|notes/));
// order from another account hidden
const reg2=await j('/public/auth/register',{method:'POST',body:{name:'Other Person',phone:'0922000111',password:'secret2'}});
ok('other account cannot read order',(await j('/public/orders/'+oid,{headers:{authorization:'Bearer '+reg2.b.token}})).s===404);
ok('wrong password',(await j('/public/auth/login',{method:'POST',body:{phone:'0911234567',password:'nope'}})).s===401);
ok('duplicate phone',(await j('/public/auth/register',{method:'POST',body:{name:'Dup Dup',phone:'+251911234567',password:'secret2'}})).s===409);
// photo endpoint without cloudinary
const fd=new FormData();fd.append('images',new Blob([new Uint8Array([1,2,3])],{type:'image/png'}),'a.png');
let ur=await fetch(B+'/products/5/images',{method:'POST',headers:staff,body:fd});ok('upload without storage -> 503',ur.status===503,await ur.text());
const fd2=new FormData();fd2.append('images',new Blob(['x'],{type:'text/plain'}),'a.txt');
ur=await fetch(B+'/products/5/images',{method:'POST',headers:staff,body:fd2});ok('non-image -> 400',ur.status===400,await ur.text());
