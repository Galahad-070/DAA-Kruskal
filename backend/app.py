from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

class DisjointSet:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
    
    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]
    
    def union(self, x, y):
        xroot = self.find(x)
        yroot = self.find(y)
        
        if xroot == yroot:
            return False
        
        if self.rank[xroot] < self.rank[yroot]:
            self.parent[xroot] = yroot
        elif self.rank[xroot] > self.rank[yroot]:
            self.parent[yroot] = xroot
        else:
            self.parent[yroot] = xroot
            self.rank[xroot] += 1
        return True

def kruskal(nodes, edges):
    node_to_idx = {node['id']: i for i, node in enumerate(nodes)}
    
    sorted_edges = sorted(edges, key=lambda e: e['weight'])
    
    ds = DisjointSet(len(nodes))
    mst = []
    total_weight = 0
    
    for edge in sorted_edges:
        u = node_to_idx[edge['source']]
        v = node_to_idx[edge['target']]
        
        if ds.union(u, v):
            mst.append(edge)
            total_weight += edge['weight']
    
    return {
        'mst': mst,
        'total_weight': total_weight,
        'node_count': len(nodes),
        'edge_count': len(mst)
    }

@app.route('/api/kruskal', methods=['POST'])
def run_kruskal():
    data = request.json
    nodes = data.get('nodes', [])
    edges = data.get('edges', [])
    
    if len(nodes) < 2:
        return jsonify({'error': 'Need at least 2 nodes'}), 400
    
    result = kruskal(nodes, edges)
    return jsonify(result)

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)