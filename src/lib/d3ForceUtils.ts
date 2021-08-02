import { Node, SimulationLink } from '@/types';
import {
  ForceManyBody, ForceLink, ForceCollide, Simulation, ForceX, ForceY,
} from 'd3-force';

export function applyForceToSimulation(
  simulation: Simulation<Node, SimulationLink> | null,
  forceType: 'x' | 'y' | 'charge' | 'link' | 'collision',
  forceValue: ForceX<Node> | ForceY<Node> | ForceManyBody<Node> | ForceLink<Node, SimulationLink> | ForceCollide<Node> | undefined,
  linkDistance?: number,
) {
  if (simulation === null) {
    return;
  }

  if (forceType === 'link' && linkDistance !== undefined) {
    const linkForce = simulation.force<ForceLink<Node, SimulationLink>>('link');
    if (linkForce !== undefined) {
      linkForce.distance(linkDistance);
    }
  } else if (forceValue !== undefined) {
    simulation.force(forceType, forceValue);
  }
}
