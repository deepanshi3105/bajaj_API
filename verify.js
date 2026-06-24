const http = require('http');

// Helper to make a POST request to localhost:3000/bfhl
function postData(payload) {
  return new Promise((resolve, reject) => {
    const dataStr = JSON.stringify(payload);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/bfhl',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataStr)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Status: ${res.statusCode}, Body: ${body}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(dataStr);
    req.end();
  });
}

// Simple assertion helper
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ Pass: ${message}`);
}

async function runTests() {
  console.log('Starting API Verification Tests...\n');

  try {
    // ----------------------------------------------------
    // Test 1: PDF Example
    // ----------------------------------------------------
    console.log('Test 1: PDF Example Dataset');
    const res1 = await postData({
      data: [
        "A->B", "A->C", "B->D", "C->E", "E->F",
        "X->Y", "Y->Z", "Z->X",
        "P->Q", "Q->R",
        "G->H", "G->H", "G->I",
        "hello", "1->2", "A->"
      ]
    });

    // Check identity
    assert(res1.user_id !== undefined, 'user_id is present');
    assert(res1.email_id !== undefined, 'email_id is present');
    assert(res1.college_roll_number !== undefined, 'college_roll_number is present');

    // Check invalid entries
    assert(res1.invalid_entries.includes('hello'), 'contains invalid "hello"');
    assert(res1.invalid_entries.includes('1->2'), 'contains invalid "1->2"');
    assert(res1.invalid_entries.includes('A->'), 'contains invalid "A->"');
    assert(res1.invalid_entries.length === 3, 'exactly 3 invalid entries');

    // Check duplicates
    assert(res1.duplicate_edges.includes('G->H'), 'contains duplicate "G->H"');
    assert(res1.duplicate_edges.length === 1, 'exactly 1 duplicate edge');

    // Check summary statistics
    assert(res1.summary.total_trees === 3, 'summary has exactly 3 trees');
    assert(res1.summary.total_cycles === 1, 'summary has exactly 1 cycle');
    assert(res1.summary.largest_tree_root === 'A', 'largest tree root is "A"');

    // Check hierarchy content
    // A component (root A, depth 4)
    const hA = res1.hierarchies.find(h => h.root === 'A');
    assert(hA !== undefined, 'component A exists');
    assert(hA.depth === 4, 'component A has depth 4');
    assert(hA.tree.A !== undefined, 'component A has tree representation');
    assert(hA.tree.A.B.D !== undefined, 'component A structure is correct (A->B->D)');
    assert(hA.tree.A.C.E.F !== undefined, 'component A structure is correct (A->C->E->F)');

    // X component (root X, cyclic)
    const hX = res1.hierarchies.find(h => h.root === 'X');
    assert(hX !== undefined, 'component X exists');
    assert(hX.has_cycle === true, 'component X has cycle flag');
    assert(Object.keys(hX.tree).length === 0, 'component X tree is empty object');
    assert(hX.depth === undefined, 'component X depth is omitted');

    // P component (root P, depth 3)
    const hP = res1.hierarchies.find(h => h.root === 'P');
    assert(hP !== undefined, 'component P exists');
    assert(hP.depth === 3, 'component P has depth 3');

    // G component (root G, depth 2)
    const hG = res1.hierarchies.find(h => h.root === 'G');
    assert(hG !== undefined, 'component G exists');
    assert(hG.depth === 2, 'component G has depth 2');

    console.log('');

    // ----------------------------------------------------
    // Test 2: Multi-parent and duplicates
    // ----------------------------------------------------
    console.log('Test 2: Multi-parent conflicts and extra duplicates');
    const res2 = await postData({
      data: [
        "A->C",
        "B->C", // C has parent A, so B->C is silently discarded
        "A->D",
        "A->D"  // duplicate
      ]
    });

    assert(res2.duplicate_edges.includes('A->D'), 'contains duplicate "A->D"');
    assert(res2.summary.total_trees === 1, 'contains 1 tree');
    // Root should be A
    const h2A = res2.hierarchies[0];
    assert(h2A.root === 'A', 'root is "A"');
    assert(h2A.tree.A.C !== undefined, 'C is child of A');
    assert(h2A.tree.A.B === undefined, 'B->C is discarded, so B does not appear as parent of C');
    assert(h2A.depth === 2, 'depth of tree is 2 (A->C and A->D are depth 2 paths)');

    console.log('');

    // ----------------------------------------------------
    // Test 3: Lexicographical root tie-breaker for largest depth
    // ----------------------------------------------------
    console.log('Test 3: Tie-breaker for largest_tree_root');
    const res3 = await postData({
      data: [
        "M->N", "N->O", // depth 3
        "P->Q", "Q->R"  // depth 3 (equal depth, P is lexicographically smaller than M? No, M is smaller!)
      ]
    });
    assert(res3.summary.largest_tree_root === 'M', 'largest_tree_root resolves to "M" (lexicographically smaller than "P")');

    const res3_swap = await postData({
      data: [
        "Z->Y", "Y->X", // depth 3
        "A->B", "B->C"  // depth 3 (A is lexicographically smaller than Z)
      ]
    });
    assert(res3_swap.summary.largest_tree_root === 'A', 'largest_tree_root resolves to "A" (lexicographically smaller than "Z")');

    console.log('');
    console.log('=============================================');
    console.log('🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
    console.log('=============================================');

  } catch (error) {
    console.error('❌ Verification failed with error:', error);
    process.exit(1);
  }
}

runTests();
