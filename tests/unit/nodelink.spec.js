import { mount } from '@vue/test-utils';
import MultiLink from '@/components/MultiLink.vue';
import App from '@/App.vue';
import {
  describe, expect, it, beforeEach,
} from 'jest';

describe('Node-Edge Utils', () => {
  describe('Arc Drawing', () => {
    let wrapper;

    beforeEach(() => {
      wrapper = mount(MultiLink, {
        propsData: {
          network: { nodes: [], edges: [{ source: { x: 100, y: 150 }, target: { x: 400, y: 450 } }] },
          app: App,
        },
      });

      // Set some computed properties
      wrapper.vm.browser = {
        height: 1000,
        width: 1000,
      };
      wrapper.vm.panelDimensions = { width: 250, height: 1000 };
      wrapper.vm.visDimensions = { width: 750, height: 1000 };
    });

    it('A straight arc returns the expected path', () => {
      // Arrange
      wrapper.vm.straightEdges = true;
      const edge = wrapper.vm.network.edges[0];

      // Act
      const arc = wrapper.vm.arcPath(true, edge, false);

      // Assert
      expect(arc).toEqual(`M ${edge.source.x + wrapper.vm.nodeMarkerLength / 2} ${edge.source.y + wrapper.vm.nodeMarkerHeight / 2} L ${edge.target.x + wrapper.vm.nodeMarkerLength / 2} ${edge.target.y + wrapper.vm.nodeMarkerHeight / 2}`);
    });

    it('A curved arc returns the expected path', () => {
      // Arrange
      wrapper.vm.straightEdges = false;
      const edge = wrapper.vm.network.edges[0];
      const dx = edge.source.x - edge.target.x;
      const dy = edge.source.y - edge.target.y;
      const dr = Math.sqrt(dx * dx + dy * dy);
      const xRotation = 0;
      const largeArc = 0;
      const sweep = 1;

      // Act
      const arc = wrapper.vm.arcPath(true, edge, false);

      // Assert
      expect(arc).toEqual(`M ${edge.source.x + wrapper.vm.nodeMarkerLength / 2}, ${edge.source.y + wrapper.vm.nodeMarkerHeight / 2} A ${dr}, ${dr} ${xRotation}, ${largeArc}, ${sweep} ${edge.target.x + wrapper.vm.nodeMarkerLength / 2},${edge.target.y + wrapper.vm.nodeMarkerHeight / 2}`);
    });
  });
});
