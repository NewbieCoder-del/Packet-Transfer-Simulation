import type { NetworkNode, NetworkEdge } from '../types/network';

/**
 * Find a direct edge between two nodes. Returns edge id or null.
 */
export function findDirectEdge(
  fromId: string,
  toId: string,
  edges: NetworkEdge[],
): string | null {
  const edge = edges.find(
    (e) =>
      e.status === 'up' &&
      ((e.from.nodeId === fromId && e.to.nodeId === toId) ||
        (e.from.nodeId === toId && e.to.nodeId === fromId))
  );
  return edge?.id ?? null;
}

/**
 * BFS to find shortest path between two nodes through active edges.
 * Returns an array of node IDs forming the path, or null if unreachable.
 */
export function findPath(
  fromId: string,
  toId: string,
  nodes: NetworkNode[],
  edges: NetworkEdge[],
): string[] | null {
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    if (edge.status !== 'up') continue;
    adjacency.get(edge.from.nodeId)?.push(edge.to.nodeId);
    adjacency.get(edge.to.nodeId)?.push(edge.from.nodeId);
  }

  const visited = new Set<string>();
  const parent = new Map<string, string | null>();
  const queue: string[] = [fromId];
  visited.add(fromId);
  parent.set(fromId, null);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === toId) {
      // Reconstruct path
      const path: string[] = [];
      let node: string | null | undefined = toId;
      while (node != null) {
        path.unshift(node);
        node = parent.get(node) ?? null;
      }
      return path;
    }
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parent.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }
  return null;
}

/**
 * Get all nodes directly connected to a given node.
 */
export function getNeighbors(
  nodeId: string,
  edges: NetworkEdge[],
): string[] {
  const neighbors: string[] = [];
  for (const edge of edges) {
    if (edge.status !== 'up') continue;
    if (edge.from.nodeId === nodeId) neighbors.push(edge.to.nodeId);
    else if (edge.to.nodeId === nodeId) neighbors.push(edge.from.nodeId);
  }
  return neighbors;
}
