const getUrlVars = require("../js/utils");

test("query string is parsed correctly", () => {
    window = Object.create(window)
    Object.defineProperty(window, "location", { value: { href: "http://localhost/?workspace=test&graph=test&configPanel=1" } })
    console.log(global.location.href)
    var {
        configPanel,
        workspace,
        graph
    } = getUrlVars();
    expect(workspace).toBe("test")
    expect(configPanel).toBe("1")
    expect(graph).toBe("test")
});