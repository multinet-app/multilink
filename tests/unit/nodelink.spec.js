import { mount } from '@vue/test-utils';
import NodeLink from '@/components/NodeLink/NodeLink.vue';
import App from '@/App.vue';
import {
  describe, expect, it, beforeEach,
} from 'jest';

describe('Node-Link Utils', () => {
  describe('Arc Drawing', () => {
    let wrapper;

    beforeEach(() => {
      wrapper = mount(NodeLink, {
        propsData: {
          graphStructure: { nodes: [], links: [{ source: { x: 100, y: 150 }, target: { x: 400, y: 450 } }] },
          app: App,
          provenance: { addObserver: () => {} }, // eslint-disable-line  @typescript-eslint/no-empty-function
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
      const link = wrapper.vm.graphStructure.links[0];

      // Act
      const arc = wrapper.vm.arcPath(true, link, false);

      // Assert
      expect(arc).toEqual(`M ${link.source.x + wrapper.vm.nodeMarkerLength / 2} ${link.source.y + wrapper.vm.nodeMarkerHeight / 2} L ${link.target.x + wrapper.vm.nodeMarkerLength / 2} ${link.target.y + wrapper.vm.nodeMarkerHeight / 2}`);
    });

    it('A curved arc returns the expected path', () => {
      // Arrange
      wrapper.vm.straightEdges = false;
      const link = wrapper.vm.graphStructure.links[0];
      const dx = link.source.x - link.target.x;
      const dy = link.source.y - link.target.y;
      const dr = Math.sqrt(dx * dx + dy * dy);
      const xRotation = 0;
      const largeArc = 0;
      const sweep = 1;

      // Act
      const arc = wrapper.vm.arcPath(true, link, false);

      // Assert
      expect(arc).toEqual(`M ${link.source.x + wrapper.vm.nodeMarkerLength / 2}, ${link.source.y + wrapper.vm.nodeMarkerHeight / 2} A ${dr}, ${dr} ${xRotation}, ${largeArc}, ${sweep} ${link.target.x + wrapper.vm.nodeMarkerLength / 2},${link.target.y + wrapper.vm.nodeMarkerHeight / 2}`);
    });
  });
});
