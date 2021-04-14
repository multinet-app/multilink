import { Node, SimulationLink } from '@/types';
import {
  ForceCenter, ForceManyBody, ForceLink, ForceCollide, Simulation,
} from 'd3-force';

export function applyForceToSimulation(
  simulation: Simulation<Node, SimulationLink> | null,
  forceType: 'center' | 'charge' | 'link' | 'collision',
  forceValue: ForceCenter<Node> | ForceManyBody<Node> | ForceLink<Node, SimulationLink> | ForceCollide<Node>,
) {
  if (simulation === null) {
    return;
  }

  simulation.force(forceType, forceValue);
}
