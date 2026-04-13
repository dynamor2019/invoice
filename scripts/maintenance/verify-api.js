import fetch from 'node-fetch';

const BASE = 'http://127.0.0.1:3001/api';

async function login(id, password) {
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, password })
  });
  if (!res.ok) throw new Error(`Login failed: ${res.statusText}`);
  return res.json();
}

async function get(endpoint, token) {
  const res = await fetch(`${BASE}${endpoint}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`GET ${endpoint} failed: ${res.statusText}`);
  return res.json();
}

async function run() {
  try {
    console.log('--- Testing Approver1 ---');
    const approver = await login('approver1', '123456');
    console.log('Logged in as approver1');
    
    const todos = await get('/todos/approver1', approver.token);
    console.log(`Approver1 Todos: ${todos.length}`);
    if (todos.length > 0) {
      console.log('First todo:', JSON.stringify(todos[0], null, 2));
    } else {
      console.log('No todos found for approver1.');
    }

    console.log('\n--- Testing User01 ---');
    const user = await login('user01', '123456');
    console.log('Logged in as user01');
    
    const bills = await get('/bills', user.token);
    console.log(`Total Bills: ${bills.length}`);
    
    const myBills = bills.filter(b => b.createdBy === 'user01' || b.submitterId === 'user01');
    console.log(`User01 Bills: ${myBills.length}`);
    
    if (myBills.length > 0) {
      console.log('First myBill:', JSON.stringify(myBills[0], null, 2));
    } else {
        console.log('No bills found for user01.');
    }

  } catch (e) {
    console.error(e);
  }
}

run();
