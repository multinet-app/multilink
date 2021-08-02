import { Node, SimulationLink } from '@/types';
import {
  ForceManyBody, ForceLink, ForceCollide, Simulation, ForceX, ForceY,
} from 'd3-force';

export function applyForceToSimulation(
  simulation: Simulation<Node, SimulationLink> | null,
  forceType: 'x' | 'y' | 'charge' | 'link' | 'collision',
  forceValue: ForceX<Node> | ForceY<Node> | ForceManyBody<Node> | ForceLink<Node, SimulationLink> | ForceCollide<Node>,
) {
  if (simulation === null) {
    return;
  }

  simulation.force(forceType, forceValue);
}
