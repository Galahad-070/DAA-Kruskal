# Water Pipeline Network - Kruskal's Algorithm Visualization

A lightweight web application for designing water pipeline/irrigation networks and computing the Minimum Spanning Tree using Kruskal's algorithm.

## Features

- **Drag & Drop Canvas**: Place houses, junctions, and water sources
- **Pipe Connections**: Click and drag between nodes to create pipes with automatic distance-based weights
- **Pan & Zoom**: Navigate large networks easily
- **Kruskal's Algorithm**: Compute MST with Disjoint Set Union (Union-Find)
- **Visual Results**: MST edges highlighted in green with total pipe length calculation

## Tech Stack

- **Backend**: Python Flask (port 5000)
- **Frontend**: React + Vite (port 3000)
- **Algorithm**: Kruskal's MST with Union-Find data structure

## Quick Start

### Option 1: Use the startup script (recommended)

```bash
cd water-pipeline-network
./start.sh
```

### Option 2: Manual startup

**Terminal 1 - Backend:**
```bash
cd water-pipeline-network/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

**Terminal 2 - Frontend:**
```bash
cd water-pipeline-network/frontend
npm install
npm run dev
```

Then open http://localhost:3000 in your browser.

## Usage

1. **Add Nodes**: Select "Add House", "Add Junction", or "Add Source" from the sidebar, then click on the canvas
2. **Connect Pipes**: Select "Connect Pipes", click on a node, drag to another node, and release
3. **Pan/Zoom**: Use "Select/Pan" tool - drag empty space to pan, scroll to zoom
4. **Run Algorithm**: Click "Run Kruskal's Algorithm" to compute the MST
5. **View Results**: Green edges show the optimal pipeline network with minimum total length

## Node Types

- 🏠 **House** (Red) - Water consumers
- ● **Junction** (Blue) - Pipe intersections
- ▲ **Source** (Green) - Water supply points

## API Endpoint

`POST /api/kruskal`
```json
{
  "nodes": [{ "id": "abc123", "type": "house", "x": 100, "y": 200 }, ...],
  "edges": [{ "id": "xyz789", "source": "abc123", "target": "def456", "weight": 150 }, ...]
}
```

Response:
```json
{
  "mst": [...],
  "total_weight": 450,
  "node_count": 5,
  "edge_count": 4
}
```

## Project Structure

```
water-pipeline-network/
├── backend/
│   ├── app.py              # Flask server with Kruskal implementation
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Main React component
│   │   ├── main.jsx        # Entry point
│   │   └── index.css       # Styles
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── start.sh                # Startup script
└── README.md
```

## Demo

![Water Pipeline Network Demo](demo.webm)



**What the demo shows:**
1. Placing houses (🏠), junctions (●), and sources (▲) on the grid
2. Connecting pipes by dragging from node to node
3. Panning (drag empty space) and zooming (scroll)
4. Running Kruskal's algorithm - MST edges turn green
5. Results panel showing total pipe length and savings
6. Deleting nodes/edges with the Delete tool or Del key
