// Checks self-service profile changes (name, email, password) and the owner editing team accounts.
// Needs a running server on port 3055 with a freshly seeded database:  node tests/profile-flow.mjs
const B='http://localhost:3055/api';
const j=async(p,o={})=>{const r=await fetch(B+p,{...o,headers:{'content-type':'application/json',...(o.headers||{})},body:o.body?JSON.stringify(o.body):undefined});let b=null;try{b=await r.json()}catch{}return {s:r.status,b}};
const ok=(n,c,x)=>console.log(c?'PASS':'FAIL',n,c?'':JSON.stringify(x));
let l=await j('/auth/login',{method:'POST',body:{email:'admin@chalamobile.com',password:'admin123'}});
let H={authorization:'Bearer '+l.b.token};
let r=await j('/auth/me',{method:'PATCH',headers:H,body:{password:'newpass1'}}); ok('password needs current',r.s===400&&r.b.code==='CURRENT_REQUIRED',r);
r=await j('/auth/me',{method:'PATCH',headers:H,body:{password:'newpass1',current_password:'wrong'}}); ok('wrong current rejected',r.s===403,r);
r=await j('/auth/me',{method:'PATCH',headers:H,body:{password:'abc',current_password:'admin123'}}); ok('short pw rejected',r.s===400,r);
r=await j('/auth/me',{method:'PATCH',headers:H,body:{password:'newpass1',current_password:'admin123'}}); ok('password changed',r.s===200&&!!r.b.token,r);
H={authorization:'Bearer '+r.b.token};
ok('old pw fails',(await j('/auth/login',{method:'POST',body:{email:'admin@chalamobile.com',password:'admin123'}})).s===401);
ok('new pw works',(await j('/auth/login',{method:'POST',body:{email:'admin@chalamobile.com',password:'newpass1'}})).s===200);
r=await j('/auth/me',{method:'PATCH',headers:H,body:{password:'third123',current_password:'newpass1'}}); ok('change again works',r.s===200,r);
r=await j('/auth/me',{method:'PATCH',headers:H,body:{email:'sales@chalamobile.com',current_password:'third123'}}); ok('duplicate email 409',r.s===409,r);
r=await j('/auth/me',{method:'PATCH',headers:H,body:{email:'Owner.New@Example.com',name:'Abdu',current_password:'third123'}}); ok('email+name changed',r.s===200&&r.b.user.email==='owner.new@example.com'&&r.b.user.name==='Abdu',r);
ok('login with new email',(await j('/auth/login',{method:'POST',body:{email:'owner.new@example.com',password:'third123'}})).s===200);
ok('old email fails',(await j('/auth/login',{method:'POST',body:{email:'admin@chalamobile.com',password:'third123'}})).s===401);
r=await j('/auth/me',{method:'PATCH',headers:H,body:{name:'Abdurehman'}}); ok('name only needs no password',r.s===200,r);
// owner edits staff
const users=(await j('/users',{headers:H})).b.users; const sales=users.find(u=>u.role==='sales');
r=await j('/users/'+sales.id,{method:'PATCH',headers:H,body:{email:'sales2@example.com',password:'salespw1'}}); ok('owner edits sales email+pw',r.s===200&&r.b.user.email==='sales2@example.com',r);
ok('sales login new',(await j('/auth/login',{method:'POST',body:{email:'sales2@example.com',password:'salespw1'}})).s===200);
r=await j('/users/'+sales.id,{method:'PATCH',headers:H,body:{email:'owner.new@example.com'}}); ok('owner dup email 409',r.s===409,r);
r=await j('/users/'+sales.id,{method:'PATCH',headers:H,body:{email:'bad'}}); ok('bad email 400',r.s===400,r);
const sl=await j('/auth/login',{method:'POST',body:{email:'sales2@example.com',password:'salespw1'}});
r=await j('/users/'+sales.id,{method:'PATCH',headers:{authorization:'Bearer '+sl.b.token},body:{email:'x@y.co'}}); ok('sales cannot use users api',r.s===403,r);
