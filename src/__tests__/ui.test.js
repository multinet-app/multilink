// Import functions
const ProvenanceLibrary = require("../libs/provenance.min.js")
window.ProvenanceLibrary = ProvenanceLibrary

const d3 = require("d3")
window.d3 = d3

const ui = require("../js/ui");

const helperFunctions = require("../js/nodeLink/helperFunctions")
window.setUpProvenance = helperFunctions.setUpProvenance
window.setUpObserver = helperFunctions.setUpObserver

const main_nodeLink = require("../js/nodeLink/main_nodeLink")
window.initializeProvenance = main_nodeLink.initializeProvenance
    //window.tagNeighbors = main_nodeLink.tagNeighbors


// Set global objects

// Mock functions that we don't want to test
function update() {

}
window.update = update;


describe("ui", () => {
    describe("searchFor", () => {
        it("Searching for node in empty list throws error", () => {
            // Arrange
            vis = {};
            vis.graph_structure = {
                "nodes": [],
                "links": []
            }
            initializeProvenance(vis.graph_structure)

            // Act + Assert
            expect(() => searchFor("someone")).toThrow()

        });

        it("Searching for node in a proper graph works as expected", () => {
            // Arrange
            person1 = { "_key": 1, "id": "nodes/1", "name": "Test Testerson" }
            person2 = { "_key": 2, "id": "nodes/2", "name": "Jimmy Test" }
            link1 = { "_key": 115100, "id": "links/1", "source": "nodes/1", "target": "nodes/2" }
            vis = {};
            vis.graph_structure = {
                "nodes": [person1, person2],
                "links": [link1]
            }
            initializeProvenance(vis.graph_structure)

            // Act 
            outcome1 = ui.searchFor("Test Testerson")
            outcome2 = ui.searchFor("Jimmy Test")
            outcome3 = ui.searchFor("test testerson")
            outcome4 = ui.searchFor("JIMMY TEST")
            outcome5 = ui.searchFor("Not There")

            // Assert
            expect(outcome1).toBe(1)
            expect(outcome2).toBe(1)
            expect(outcome3).toBe(0)
            expect(outcome4).toBe(0)
            expect(outcome5).toBe(-1)
        });
    });
});