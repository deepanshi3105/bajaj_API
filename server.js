const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all requests
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Serve static frontend files from 'public' directory
app.use(express.static('public'));

// POST /bfhl endpoint
app.post('/bfhl', (req, res) => {
  try {
    const { data } = req.body;

    // Validate request body
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: "'data' parameter is required and must be an array of strings."
      });
    }

    const invalid_entries = [];
    const parsedEdges = [];
    const duplicate_edges_set = new Set();
    const seen_edges_set = new Set();

    // 1. Trim and Validate format X->Y
    data.forEach((entry) => {
      if (entry === null || entry === undefined) {
        invalid_entries.push('');
        return;
      }
      
      const trimmed = String(entry).trim();
      
      // Match uppercase letters separated by ->
      const match = trimmed.match(/^([A-Z])->([A-Z])$/);
      if (!match) {
        invalid_entries.push(trimmed);
        return;
      }

      const [, parent, child] = match;

      // Self-loops are treated as invalid
      if (parent === child) {
        invalid_entries.push(trimmed);
        return;
      }

      // Valid format edge
      const edgeKey = `${parent}->${child}`;
      if (seen_edges_set.has(edgeKey)) {
        duplicate_edges_set.add(edgeKey);
      } else {
        seen_edges_set.add(edgeKey);
        parsedEdges.push({ parent, child, key: edgeKey });
      }
    });

    const duplicate_edges = Array.from(duplicate_edges_set);

    // 2. Resolve Multi-parent Conflicts (first-encountered wins)
    const childToParent = new Map();
    const filteredEdges = [];

    parsedEdges.forEach((edge) => {
      if (childToParent.has(edge.child)) {
        // Silently discard subsequent parents for the same child
        return;
      }
      childToParent.set(edge.child, edge.parent);
      filteredEdges.push(edge);
    });

    // 3. Build adjacency lists and collect unique nodes
    const adjUndirected = new Map();
    const adjDirected = new Map();
    const allNodesSet = new Set();
    const nodesInFirstSeenOrder = [];

    // Helper to keep track of nodes in order of their first appearance
    const registerNode = (node) => {
      if (!allNodesSet.has(node)) {
        allNodesSet.add(node);
        nodesInFirstSeenOrder.push(node);
      }
    };

    filteredEdges.forEach((edge) => {
      registerNode(edge.parent);
      registerNode(edge.child);

      // Directed graph (parent -> child)
      if (!adjDirected.has(edge.parent)) {
        adjDirected.set(edge.parent, []);
      }
      adjDirected.get(edge.parent).push(edge.child);

      // Undirected graph for finding connected components
      if (!adjUndirected.has(edge.parent)) {
        adjUndirected.set(edge.parent, new Set());
      }
      if (!adjUndirected.has(edge.child)) {
        adjUndirected.set(edge.child, new Set());
      }
      adjUndirected.get(edge.parent).add(edge.child);
      adjUndirected.get(edge.child).add(edge.parent);
    });

    // 4. Find Connected Components (preserving first-seen order)
    const visited = new Set();
    const components = [];

    nodesInFirstSeenOrder.forEach((node) => {
      if (visited.has(node)) return;

      // BFS to find all nodes in the component
      const componentNodes = [];
      const queue = [node];
      visited.add(node);

      while (queue.length > 0) {
        const curr = queue.shift();
        componentNodes.push(curr);

        const neighbors = adjUndirected.get(curr) || [];
        neighbors.forEach((neighbor) => {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        });
      }

      components.push(componentNodes);
    });

    // Helper functions for trees
    const buildTree = (u) => {
      const tree = {};
      const children = adjDirected.get(u) || [];
      // Sort children lexicographically
      const sortedChildren = [...children].sort();
      sortedChildren.forEach((child) => {
        tree[child] = buildTree(child);
      });
      return tree;
    };

    const getDepth = (u) => {
      const children = adjDirected.get(u) || [];
      if (children.length === 0) return 1;
      let maxChildDepth = 0;
      children.forEach((child) => {
        maxChildDepth = Math.max(maxChildDepth, getDepth(child));
      });
      return 1 + maxChildDepth;
    };

    // 5. Process hierarchies for each component
    const hierarchies = [];
    let total_trees = 0;
    let total_cycles = 0;
    let maxDepth = -1;
    let largest_tree_root = '';

    components.forEach((compNodes) => {
      // Find nodes in the component that have in-degree 0
      const roots = compNodes.filter((node) => !childToParent.has(node));

      if (roots.length > 0) {
        // Component is a tree. There will be exactly one root.
        const root = roots[0];
        total_trees++;

        const treeObj = {
          [root]: buildTree(root)
        };
        const depth = getDepth(root);

        hierarchies.push({
          root,
          tree: treeObj,
          depth
        });

        // Determine largest tree root with tie-breakers
        if (depth > maxDepth) {
          maxDepth = depth;
          largest_tree_root = root;
        } else if (depth === maxDepth) {
          // Lexicographical tie-breaker
          if (!largest_tree_root || root < largest_tree_root) {
            largest_tree_root = root;
          }
        }
      } else {
        // Component has no root (it's cyclic)
        total_cycles++;
        // Use lexicographically smallest node as the root
        const root = [...compNodes].sort()[0];

        hierarchies.push({
          root,
          tree: {},
          has_cycle: true
        });
      }
    });

    // 6. Identity fields from environment variables or defaults
    const user_id = process.env.USER_ID || 'john_doe_17091999';
    const email_id = process.env.EMAIL_ID || 'john.doe@college.edu';
    const college_roll_number = process.env.COLLEGE_ROLL_NUMBER || '21CS1001';

    // Construct response
    const response = {
      user_id,
      email_id,
      college_roll_number,
      hierarchies,
      invalid_entries,
      duplicate_edges,
      summary: {
        total_trees,
        total_cycles,
        largest_tree_root
      }
    };

    return res.json(response);
  } catch (error) {
    console.error('Error processing hierarchy request:', error);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred while processing the request.'
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
