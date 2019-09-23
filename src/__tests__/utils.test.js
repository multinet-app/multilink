const getUrlVars = require("../js/utils");

describe("utils", () => {
    describe("getUrlVars", () => {
        it("When parameters are correctly defined, they are parsed correctly", () => {
            // Arrange
            window = Object.create(window)
            Object.defineProperty(window, "location", { value: { href: "http://localhost/?workspace=test&graph=test&configPanel=1" } })

            // Act
            var {
                configPanel,
                workspace,
                graph
            } = getUrlVars();

            // Assert
            expect(workspace).toBe("test")
            expect(configPanel).toBe("1")
            expect(graph).toBe("test")
        });
    });
});