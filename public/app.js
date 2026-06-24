document.addEventListener('DOMContentLoaded', () => {
  const jsonInput = document.getElementById('json-input');
  const validationMsg = document.getElementById('validation-msg');
  const submitBtn = document.getElementById('submit-btn');
  const resetBtn = document.getElementById('reset-btn');
  const resultsPanel = document.getElementById('results-panel');
  const resultsContent = document.querySelector('.results-content');
  const emptyView = document.querySelector('.empty-view');
  
  // Summary elements
  const sumTrees = document.getElementById('sum-trees');
  const sumCycles = document.getElementById('sum-cycles');
  const sumLargest = document.getElementById('sum-largest');
  
  // Settings elements
  const settingsToggleBtn = document.getElementById('settings-toggle-btn');
  const settingsPanel = document.getElementById('settings-panel');
  const apiUrlInput = document.getElementById('api-url-input');
  const saveApiUrlBtn = document.getElementById('save-api-url-btn');

  // Load saved API URL from localStorage
  let backendApiUrl = localStorage.getItem('backend_api_url') || '';
  apiUrlInput.value = backendApiUrl;

  // Toggle Settings Panel
  settingsToggleBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
  });

  // Save Settings
  saveApiUrlBtn.addEventListener('click', () => {
    backendApiUrl = apiUrlInput.value.trim();
    localStorage.setItem('backend_api_url', backendApiUrl);
    
    // Add success visual feedback
    saveApiUrlBtn.textContent = 'Saved!';
    saveApiUrlBtn.style.background = 'var(--success)';
    setTimeout(() => {
      saveApiUrlBtn.textContent = 'Save';
      saveApiUrlBtn.style.background = '';
      settingsPanel.classList.add('hidden');
    }, 1000);
  });
  
  // Containers
  const hierarchiesContainer = document.getElementById('hierarchies-container');
  const duplicateEdgesList = document.getElementById('duplicate-edges-list');
  const invalidEntriesList = document.getElementById('invalid-entries-list');
  const dupeCount = document.getElementById('dupe-count');
  const invalidCount = document.getElementById('invalid-count');
  const rawJsonOutput = document.getElementById('raw-json-output');
  
  // Creator Metadata
  const userMetadata = document.getElementById('user-metadata');
  const metaUserId = document.getElementById('meta-user-id');
  const metaEmail = document.getElementById('meta-email');
  const metaRoll = document.getElementById('meta-roll');

  // Track mouse coordinates for dynamic cursor glow
  document.addEventListener('mousemove', (e) => {
    document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
    document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
  });

  // Predefined Examples
  const examples = {
    pdf: {
      data: [
        "A->B", "A->C", "B->D", "C->E", "E->F",
        "X->Y", "Y->Z", "Z->X",
        "P->Q", "Q->R",
        "G->H", "G->H", "G->I",
        "hello", "1->2", "A->"
      ]
    },
    trees: {
      data: [
        "A->B", "A->C", "B->D",
        "M->N", "N->O",
        "X->Y"
      ]
    },
    cycles: {
      data: [
        "A->B", "B->C", "C->A",
        "X->Y", "Y->X"
      ]
    },
    conflicts: {
      data: [
        "A->C",
        "B->C", 
        "A->D",
        "A->D", 
        "X->Y",
        "X->Y", 
        "Y->Z",
        "Z->X" 
      ]
    }
  };

  // Set default example
  jsonInput.value = JSON.stringify(examples.pdf, null, 2);

  // Live input validator (debounced)
  let valTimeout;
  jsonInput.addEventListener('input', () => {
    clearTimeout(valTimeout);
    valTimeout = setTimeout(validateInputLive, 400);
  });

  function validateInputLive() {
    const rawVal = jsonInput.value.trim();
    if (!rawVal) {
      validationMsg.style.display = 'none';
      jsonInput.style.borderColor = '';
      return;
    }
    try {
      const parsed = JSON.parse(rawVal);
      if (parsed && parsed.data && Array.isArray(parsed.data)) {
        validationMsg.style.display = 'none';
        jsonInput.style.borderColor = 'rgba(16, 185, 129, 0.4)'; // green border
      } else {
        showError('JSON must contain a "data" array of strings.');
      }
    } catch (e) {
      showError('Invalid JSON structure.');
    }
  }

  // Example Buttons Handler
  document.querySelectorAll('.example-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-example');
      if (examples[type]) {
        jsonInput.value = JSON.stringify(examples[type], null, 2);
        validationMsg.style.display = 'none';
        jsonInput.style.borderColor = '';
      }
    });
  });

  // Reset Handler
  resetBtn.addEventListener('click', () => {
    jsonInput.value = '';
    validationMsg.style.display = 'none';
    jsonInput.style.borderColor = '';
    
    // Reset view
    resultsPanel.classList.add('empty-state');
    resultsContent.classList.add('hidden');
    emptyView.classList.remove('hidden');
    userMetadata.classList.add('hidden');
  });

  // Submit Handler
  submitBtn.addEventListener('click', async () => {
    const rawVal = jsonInput.value.trim();
    validationMsg.style.display = 'none';
    jsonInput.style.borderColor = '';

    if (!rawVal) {
      showError('Please enter a JSON dataset.');
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(rawVal);
    } catch (e) {
      showError('Invalid JSON format. Please check quotes and commas.');
      return;
    }

    if (!parsed || !parsed.data || !Array.isArray(parsed.data)) {
      showError('JSON must contain a "data" array of strings.');
      return;
    }

    // Start loader
    const spinner = submitBtn.querySelector('.spinner');
    const btnText = submitBtn.querySelector('.btn-text');
    spinner.classList.remove('hidden');
    btnText.textContent = 'Parsing Graph...';
    submitBtn.disabled = true;

    try {
      const apiEndpoint = backendApiUrl
        ? `${backendApiUrl.replace(/\/$/, '')}/bfhl`
        : '/bfhl';

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(parsed)
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Server error occurred.');
      }

      const result = await response.json();
      displayResults(result);
    } catch (error) {
      console.error(error);
      showError(`API Error: ${error.message}`);
      
      // Reset view to empty state on failure
      resultsPanel.classList.add('empty-state');
      resultsContent.classList.add('hidden');
      emptyView.classList.remove('hidden');
      userMetadata.classList.add('hidden');
    } finally {
      // Stop loader
      spinner.classList.add('hidden');
      btnText.textContent = 'Submit Request';
      submitBtn.disabled = false;
    }
  });

  function showError(msg) {
    validationMsg.textContent = msg;
    validationMsg.style.display = 'block';
    jsonInput.style.borderColor = 'var(--error)';
  }

  function displayResults(data) {
    // Reveal results panel
    resultsPanel.classList.remove('empty-state');
    emptyView.classList.add('hidden');
    resultsContent.classList.remove('hidden');
    
    // 1. Summary Cards
    sumTrees.textContent = data.summary.total_trees;
    sumCycles.textContent = data.summary.total_cycles;
    sumLargest.textContent = data.summary.largest_tree_root || 'None';

    // 2. Render Hierarchies
    hierarchiesContainer.innerHTML = '';
    
    if (data.hierarchies && data.hierarchies.length > 0) {
      data.hierarchies.forEach(h => {
        const card = document.createElement('div');
        const isCycle = !!h.has_cycle;
        card.className = `hierarchy-card ${isCycle ? 'cycle-type' : 'tree-type'}`;

        let headerHtml = `
          <div class="hierarchy-card-header">
            <div class="hierarchy-root-title">
              <span class="root-label-badge">${h.root}</span>
              <span class="hierarchy-badge-type">${isCycle ? 'Cycle Component' : 'Tree Component'}</span>
            </div>
            ${!isCycle ? `<span class="depth-indicator">Depth: <strong>${h.depth}</strong></span>` : ''}
          </div>
        `;

        let bodyHtml = `<div class="tree-visual-container">`;
        if (isCycle) {
          bodyHtml += `
            <div class="cycle-msg">
              <span class="cycle-msg-icon">🔄</span>
              <span><strong>Cyclic loop detected!</strong> The component contains closed loops. The lexicographically smallest node <strong>${h.root}</strong> is designated as the root.</span>
            </div>
          `;
        } else {
          // Render nested tree
          bodyHtml += renderTreeMarkup(h.root, h.tree[h.root], 0);
        }
        bodyHtml += `</div>`;

        card.innerHTML = headerHtml + bodyHtml;
        hierarchiesContainer.appendChild(card);
      });

      // Bind collapse events
      bindCollapsibleBehavior();

    } else {
      hierarchiesContainer.innerHTML = '<div class="empty-tag-list">No valid components to display.</div>';
    }

    // 3. Render Duplicate Edges
    duplicateEdgesList.innerHTML = '';
    dupeCount.textContent = data.duplicate_edges.length;
    if (data.duplicate_edges.length > 0) {
      data.duplicate_edges.forEach(edge => {
        const tag = document.createElement('span');
        tag.className = 'tag tag-dupe';
        tag.textContent = edge;
        duplicateEdgesList.appendChild(tag);
      });
    } else {
      duplicateEdgesList.innerHTML = '<span class="empty-tag-list">No duplicate edges found.</span>';
    }

    // 4. Render Invalid Entries
    invalidEntriesList.innerHTML = '';
    invalidCount.textContent = data.invalid_entries.length;
    if (data.invalid_entries.length > 0) {
      data.invalid_entries.forEach(entry => {
        const tag = document.createElement('span');
        tag.className = 'tag tag-invalid';
        tag.textContent = entry || '""';
        invalidEntriesList.appendChild(tag);
      });
    } else {
      invalidEntriesList.innerHTML = '<span class="empty-tag-list">No invalid entries found.</span>';
    }

    // 5. Raw JSON Output
    rawJsonOutput.textContent = JSON.stringify(data, null, 2);

    // 6. User metadata footer update
    metaUserId.textContent = data.user_id;
    metaEmail.textContent = data.email_id;
    metaRoll.textContent = data.college_roll_number;
    userMetadata.classList.remove('hidden');
  }

  // Recursive tree markup with depth indicators and expand collapse toggles
  function renderTreeMarkup(nodeName, childrenObj, depth) {
    const childKeys = Object.keys(childrenObj || {});
    const hasChildren = childKeys.length > 0;
    
    let html = `<div class="tree-node depth-${depth}">`;
    
    // Add clickable class if there are children
    const clickableClass = hasChildren ? 'collapsible-node' : '';
    html += `
      <span class="node-badge ${clickableClass}" data-depth="${depth}">
        ${hasChildren ? '<span class="toggle-arrow">▼</span>' : ''}
        <span class="node-label">${nodeName}</span>
      </span>
    `;
    
    if (hasChildren) {
      html += `<div class="node-children">`;
      childKeys.sort().forEach(childName => {
        html += renderTreeMarkup(childName, childrenObj[childName], depth + 1);
      });
      html += `</div>`;
    }
    
    html += `</div>`;
    return html;
  }

  // Attach click listener to toggle collapse state on node badges
  function bindCollapsibleBehavior() {
    document.querySelectorAll('.collapsible-node').forEach(badge => {
      badge.addEventListener('click', (e) => {
        const parentNode = badge.closest('.tree-node');
        const childrenContainer = parentNode.querySelector(':scope > .node-children');
        const arrow = badge.querySelector('.toggle-arrow');
        
        if (childrenContainer) {
          if (childrenContainer.classList.contains('collapsed-children')) {
            childrenContainer.classList.remove('collapsed-children');
            badge.classList.remove('node-badge-collapsed');
            if (arrow) arrow.textContent = '▼';
          } else {
            childrenContainer.classList.add('collapsed-children');
            badge.classList.add('node-badge-collapsed');
            if (arrow) arrow.textContent = '▶';
          }
        }
      });
    });
  }
});
