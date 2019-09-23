// Import functions
const getUrlVars = require("../js/utils");


// Set global objects
window = Object.create(window)
Object.defineProperty(window, "location", { value: { href: "" } })


describe("utils", () => {
    describe("getUrlVars", () => {
        it("When parameters are correctly defined, they are parsed correctly", () => {
            // Arrange
            window.location.href = "http://localhost/?workspace=test&graph=test&configPanel=1"

            // Act
            var {
                configPanel,
                workspace,
                graph
            } = getUrlVars();

            // Assert
            expect(workspace).toBe("test")
            expect(graph).toBe("test")
            expect(configPanel).toBe("1")
        });

        it("When parameters are key words, they're still parsed as strings", () => {
            // Arrange
            window.location.href = "http://localhost/?workspace=undefined&graph=return&configPanel=true"

            // Act
            var {
                configPanel,
                workspace,
                graph
            } = getUrlVars();

            // Assert
            expect(workspace).toBe("undefined")
            expect(graph).toBe("return")
            expect(configPanel).toBe("true")
        });
    });
});