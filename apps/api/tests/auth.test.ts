import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { hash } from 'argon2';
import { eq, inArray } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { connectDatabase } from '../src/db.js';
import { groups, students, sessions } from '../src/schema.js';

test('authentication against PostgreSQL: isolation, CSRF, rotation, expiration and logout', async () => {
 const c=connectDatabase(); const app=buildApp({logger:false,origin:'http://localhost:5173',secureCookies:false});
 const groupId=randomUUID(); const ids=[randomUUID(),randomUUID()]; const suffix=randomUUID();
 const password=randomBytes(24).toString('hex'); const passwordHash=await hash(password);
 const headers={'x-csrf-protection':'1',origin:'http://localhost:5173'};
 const login=(n:number, cookie?:string) => app.inject({method:'POST',url:'/api/auth/login',headers:{...headers,...(cookie?{cookie}:{})},payload:{login:`test-${suffix}-${n}`,password}});
 const getCookie=(r:{headers:Record<string,unknown>})=>String(r.headers['set-cookie']).split(';')[0];
 const me=(cookie?:string,url='/api/me')=>app.inject({method:'GET',url,headers:cookie?{cookie}:{}});
 try {
  await c.db.insert(groups).values({id:groupId,name:`TEST-${suffix}`,faculty:'Тестовый',program:'Тестовая',year:1});
  await c.db.insert(students).values(ids.map((id,i)=>({id,login:`test-${suffix}-${i}`,fullName:`Вымышленный студент ${i}`,groupId,passwordHash})));
  assert.equal((await me()).statusCode,401);
  assert.equal((await me('session=forged')).statusCode,401);
  assert.equal((await app.inject({method:'POST',url:'/api/auth/login',payload:{login:`test-${suffix}-0`,password}})).statusCode,403);
  assert.equal((await app.inject({method:'POST',url:'/api/auth/login',headers:{...headers,origin:'https://evil.example'},payload:{login:`test-${suffix}-0`,password}})).statusCode,403);
  assert.equal((await app.inject({method:'POST',url:'/api/auth/login',headers,payload:{login:'x'}})).statusCode,400);
  const bad=await app.inject({method:'POST',url:'/api/auth/login',headers,payload:{login:`test-${suffix}-0`,password:'wrong'}});
  const missing=await app.inject({method:'POST',url:'/api/auth/login',headers,payload:{login:'missing-'+suffix,password:'wrong'}});
  assert.equal(bad.statusCode,401); assert.equal(bad.body,missing.body);
  const a=await login(0); const b=await login(1); assert.equal(a.statusCode,200); assert.equal(b.statusCode,200);
  assert.match(String(a.headers['set-cookie']),/HttpOnly/); assert.match(String(a.headers['set-cookie']),/SameSite=Lax/);
  const ac=getCookie(a),bc=getCookie(b);
  const profile=(await me(ac)).json().data; assert.equal(profile.id,ids[0]);
  assert.deepEqual(Object.keys(profile).sort(),['id','fullName','faculty','program','year','groupName'].sort());
  assert.equal((await me(bc)).json().data.id,ids[1]);
  assert.equal((await me(ac,`/api/me?studentId=${ids[1]}`)).json().data.id,ids[0]);
  const rotated=await login(0,ac); assert.equal(rotated.statusCode,200); assert.equal((await me(ac)).statusCode,401);
  const rc=getCookie(rotated); const token=rc.slice(rc.indexOf('=')+1);
  const [session]=await c.db.select().from(sessions).where(eq(sessions.studentId,ids[0]));
  assert.equal(session.tokenHash,createHash('sha256').update(token).digest('hex')); assert.notEqual(session.tokenHash,token);
  assert.equal((await app.inject({method:'POST',url:'/api/auth/logout',headers:{cookie:rc}})).statusCode,403);
  assert.equal((await me(rc)).statusCode,200);
  assert.equal((await app.inject({method:'POST',url:'/api/auth/logout',headers:{...headers,cookie:rc}})).statusCode,204);
  assert.equal((await me(rc)).statusCode,401); assert.equal((await me(bc)).statusCode,200);
  await c.db.update(sessions).set({expiresAt:new Date(Date.now()-1000)}).where(eq(sessions.studentId,ids[1]));
  assert.equal((await me(bc)).statusCode,401);
  let limited=false;
  for(let i=0;i<11;i++){ const r=await app.inject({method:'POST',url:'/api/auth/login',headers,payload:{login:'missing-'+suffix,password:'wrong'}}); if(r.statusCode===429){limited=true;break;} }
  assert(limited);
 } finally {
  await app.close();
  await c.db.delete(students).where(inArray(students.id,ids));
  await c.db.delete(groups).where(eq(groups.id,groupId));
  await c.close();
 }
});
