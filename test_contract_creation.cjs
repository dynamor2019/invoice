const fetch = require('node-fetch');

async function testContractCreation() {
  try {
    // 1. Login first
    console.log('1. Logging in...');
    const loginRes = await fetch('http://127.0.0.1:8080/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'proc1', password: '123456' })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginRes.status}`);
    }
    
    const loginData = await loginRes.json();
    console.log('Login successful:', loginData.name);
    
    const token = loginData.token;
    
    // 2. Get projects
    console.log('2. Getting projects...');
    const projectsRes = await fetch('http://127.0.0.1:8080/api/projects', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const projects = await projectsRes.json();
    console.log(`Found ${projects.length} projects`);
    
    if (projects.length === 0) {
      throw new Error('No projects found');
    }
    
    const projectId = projects[0].id;
    console.log(`Using project: ${projects[0].name} (${projectId})`);
    
    // 3. Create contract with materials
    console.log('3. Creating contract with materials...');
    
    const contractData = {
      projectId: projectId,
      contractName: '测试合同-材料同步',
      supplierId: '1', // Add required supplierId
      supplierName: '测试供应商',
      contractAmount: '50000',
      paymentMethod: '预付30%，验收后70%',
      materialList: [
        {
          name: '测试材料A',
          specification: '规格A',
          unit: 'kg',
          quantity: 100,
          unitPrice: 50,
          totalPrice: 5000,
          remarks: '测试备注A',
          category: '材料清单'
        },
        {
          name: '测试材料B',
          specification: '规格B',
          unit: 'm',
          quantity: 200,
          unitPrice: 25,
          totalPrice: 5000,
          remarks: '测试备注B',
          category: '施工清单'
        }
      ]
    };
    
    const contractRes = await fetch('http://127.0.0.1:8080/api/supplier-contracts', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contractData)
    });
    
    if (!contractRes.ok) {
      const error = await contractRes.text();
      throw new Error(`Contract creation failed: ${contractRes.status} - ${error}`);
    }
    
    const contractResult = await contractRes.json();
    console.log('Contract created successfully:', contractResult.id);
    
    // 4. Check if materials were synced
    console.log('4. Checking materials...');
    const materialsRes = await fetch(`http://127.0.0.1:8080/api/projects/${projectId}/materials`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const materials = await materialsRes.json();
    console.log(`Found ${materials.length} materials in project`);
    
    const syncedMaterials = materials.filter(m => m.supplier === '测试供应商');
    console.log(`Found ${syncedMaterials.length} materials from test supplier`);
    
    syncedMaterials.forEach(m => {
      console.log(`- ${m.name} (${m.type}) - ${m.supplier}`);
    });
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testContractCreation();