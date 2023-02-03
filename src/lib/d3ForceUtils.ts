import {
  ForceManyBody, ForceLink, ForceCollide, Simulation, ForceX, ForceY,
} from 'd3';
import { Node, SimulationEdge } from '@/types';

export function applyForceToSimulation(
  simulation: Simulation<Node, SimulationEdge> | null,
  forceType: 'x' | 'y' | 'charge' | 'edge' | 'collision',
  forceValue: ForceX<Node> | ForceY<Node> | ForceManyBody<Node> | ForceLink<Node, SimulationEdge> | ForceCollide<Node> | undefined,
  edgeDistance?: number,
) {
  if (simulation === null) {
    return;
  }

  if (forceType === 'edge' && edgeDistance !== undefined) {
    const edgeForce = simulation.force<ForceLink<Node, SimulationEdge>>('edge');
    if (edgeForce !== undefined) {
      edgeForce.distance(edgeDistance);
    }
  } else if (forceValue !== undefined) {
    simulation.force(forceType, forceValue);
  }
}
