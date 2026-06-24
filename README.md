# NexusGraph: Advanced Tree & Cycle Engine

NexusGraph is a full-stack REST API and dynamic frontend application built to process complex network structures. It parses hierarchical parent-child relationships, isolates circular dependency loops, resolves multi-parent conflicts, calculates tree path depths, and identifies duplicates and formatting issues in the inputs.

## 🚀 Features

- **Hierarchical Network Parser**: Converts string representation of edges (`X->Y`) into structured trees.
- **Cycle Detection**: Automatically isolates component loops using BFS/DFS traversals.
- **Conflict Resolution**: Silently resolves multi-parent conflicts using a first-come-first-serve strategy.
- **Dynamic Frontend**: Modern, dark-themed responsive glassmorphism UI with interactive nodes, expandable hierarchies, and live input validation.
- **Raw JSON Inspector**: View the raw API response directly at the top of the analysis panel.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, CORS
- **Frontend**: HTML5, Vanilla CSS3 (Custom Variables, Glow Orbs, Glassmorphism), Javascript (ES6+)
- **Testing**: Native HTTP client test runner (`verify.js`)

---

## 💻 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16.0.0 or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/deepanshi3105/bajaj_API.git
   cd bajaj_API
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```env
   PORT=3000
   USER_ID=your_name_ddmmyyyy
   EMAIL_ID=your.email@college.edu
   COLLEGE_ROLL_NUMBER=YOUR_ROLL_NUM
   ```

### Running the App

Start the development server:
```bash
npm start
```
The application will be available at `http://localhost:3000`.

### Running Tests

To run the automated verification suite:
```bash
node verify.js
```

---

## 🔌 API Documentation

### POST `/bfhl`

Processes a list of node edges.

#### Request Header:
- `Content-Type: application/json`

#### Request Body:
```json
{
  "data": [
    "A->B", "A->C", "B->D", "C->E", "E->F",
    "X->Y", "Y->Z", "Z->X",
    "P->Q", "Q->R",
    "G->H", "G->H", "G->I",
    "hello", "1->2", "A->"
  ]
}
```

#### Response Body:
```json
{
  "user_id": "john_doe_17091999",
  "email_id": "john.doe@college.edu",
  "college_roll_number": "21CS1001",
  "hierarchies": [
    {
      "root": "A",
      "tree": {
        "A": {
          "B": { "D": {} },
          "C": { "E": { "F": {} } }
        }
      },
      "depth": 4
    },
    {
      "root": "X",
      "tree": {},
      "has_cycle": true
    }
  ],
  "invalid_entries": ["hello", "1->2", "A->"],
  "duplicate_edges": ["G->H"],
  "summary": {
    "total_trees": 3,
    "total_cycles": 1,
    "largest_tree_root": "A"
  }
}
```
