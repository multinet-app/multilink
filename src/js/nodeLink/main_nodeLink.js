// Set local namespaces
let vis = {
    // Variables
    configToggle: undefined,
    graph_structure: {},
    nodeTypes: {},
    panelDimensions: { width: 0, height: 0 },
    visDimensions: { width: 0, height: 0 },
    visMargins: {
        left: 25,
        right: 25,
        top: 25,
        bottom: 25
    },
    svg: undefined,
    simulation: undefined,
    simOn: false,
    scales: {},
    edgeScale: d3.scaleLinear().domain([0, 1]),
    circleScale: d3.scaleLinear().domain([0, 1]),
    colorClasses: [],
    nodeColors: ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854'],
    edgeColor: "#888888",
    nodeLabel: "id",
    nodeFontSize: 14,
    nodeMarkerLength: 50,
    nodeMarkerHeight: 50,
    selectNeighbors: true,
    nodeSizeAttr: undefined,
    drawBars: undefined,
    barPadding: 3,
    straightEdges: false,
    isDirected: false,
    isMultiEdge: false,
    onNode: {},
    attributes: {
        edgeWidthKey: undefined
    },

    // Functions
    nodeLength: () => {},
    nodeHeight: () => {}
};

let browser = {
    height: 0,
    width: 0
};

// Draws the visualization on first load
async function makeVis() {
    //Load from multinet
    vis.graph_structure = await load_data(workspace, graph)

    // Set up the search box
    populateSearchList(vis.graph_structure)
    resetSearchBox()

    // Start provenance
    await initializeProvenance(vis.graph_structure)

    // Attach the search box code to the button
    d3.select('#searchButton').on("click", () => searchForNode());
    d3.select('#clear-selection').on("click", () => clearSelections());

    // Attach the toggle to the config panel button
    d3.select('#panelControl').on("click", () => vis.configToggle = toggleConfig(vis.configToggle));

    loadVis();

    // Set the control panel
    vis.configToggle = toggleConfig(configPanel)

    // Add the control panel interactivity 
    addConfigPanel()
}

vis.nodeLength = function(node) {
    let nodeSizeScale = d3
        .scaleLinear()
        .range([vis.nodeMarkerLength / 2, vis.nodeMarkerLength * 2])
        .clamp(true);

    //if an attribute has been assigned to nodeSizeAttr, set domain
    // if (vis.nodeSizeAttr) {
    //     nodeSizeScale.domain(
    //         config.attributeScales.node[vis.nodeSizeAttr].domain
    //     );
    // }

    let value =
        // vis.nodeSizeAttr && !vis.drawBars ?
        // nodeSizeScale(node[vis.nodeSizeAttr]) :
        vis.nodeMarkerLength;

    //make circles a little larger than just the radius of the marker;
    return value; //config.nodeIsRect ? value : value * 1.3;
};

vis.nodeHeight = function(node) {
    let nodeSizeScale = d3
        .scaleLinear()
        .range([vis.nodeMarkerHeight / 2, vis.nodeMarkerHeight * 2])
        .clamp(true);

    //if an attribute has been assigned to nodeSizeAttr, set domain
    // if (vis.nodeSizeAttr) {
    //     nodeSizeScale.domain(
    //         config.attributeScales.node[vis.nodeSizeAttr].domain
    //     );
    // }

    let value =
        // vis.nodeSizeAttr && !vis.drawBars ?
        // nodeSizeScale(node[vis.nodeSizeAttr]) :
        vis.nodeMarkerHeight;
    return value; //config.nodeIsRect ? value : value * 1.3;
};

function setGlobalScales() {

    //Create Scale Functions
    //function to determine fill color of nestedCategoricalMarks
    catFill = function(attr, value) {
        //assume there are defined domain and ranges for these
        let nodeFillScale = d3
            .scaleOrdinal()
            .domain(config.attributeScales.node[attr].domain)
            .range(config.attributeScales.node[attr].range);

        return nodeFillScale(value);
    };

    // nodeStroke = function(selected) {
    //   return selected
    //     ? config.style.selectedNodeColor
    //     : config.nodeLink.noNodeStroke;
    // };

    edgeColor = function(edge) {
        let edgeStrokeScale = d3.scaleOrdinal();

        if (config.nodeLink.edgeStrokeAttr) {
            edgeStrokeScale
                .domain(
                    config.attributeScales.edge[config.nodeLink.edgeStrokeAttr].domain
                )
                .range(
                    config.attributeScales.edge[config.nodeLink.edgeStrokeAttr].range
                );
        }

        let value = config.nodeLink.edgeStrokeAttr ?
            edgeStrokeScale(edge[config.nodeLink.edgeStrokeAttr]) :
            config.nodeLink.noEdgeColor;

        return value;

        // edge.selected
        // ? config.style.selectedEdgeColor
        // : value;
    };

    edgeWidth = function(edge) {

        let edgeWidthScale = d3
            .scaleLinear()
            .range([2, 10])
            .clamp(true)

        if (config.nodeLink.edgeWidthAttr) {
            edgeWidthScale
                .domain(config.attributeScales.edge[config.nodeLink.edgeWidthAttr].domain)
        }


        let value = config.nodeLink.edgeWidthAttr ?
            edgeWidthScale(edge[config.nodeLink.edgeWidthAttr]) :
            (edgeWidthScale.range()[1] - edgeWidthScale.range()[0]) / 3


        return value;
    };
}

// Setup function that does initial sizing and setting up of elements for node-link diagram.
function loadVis() {
    // Set total dimensions
    // let targetDiv = d3.select("#targetSize");
    browser.width = d3.select("body").style("width").replace("px", "");
    browser.height = d3.select("body").style("height").replace("px", "");

    // Set dimensions of the node link
    vis.visDimensions.width = browser.width * 0.75 + 12;
    vis.visDimensions.height = browser.height * 1;

    // Set dimensions of panel
    vis.panelDimensions.width = browser.width * 0.25;
    vis.panelDimensions.height = browser.height * 1;

    // Size panel
    d3.select("#visPanel").style("width", vis.panelDimensions.width + "px");

    // Get with of the content (panel width - margins) as dimensions for the legend
    let parentWidth = d3
        .select("#visPanel")
        .select(".content")
        .node()
        .getBoundingClientRect().width;

    // Size the legend
    legend = d3
        .select("#legend-svg")
        .attr("width", parentWidth)
        .attr("height", 270);

    // Size the node link
    vis.svg = d3
        .select("#node-link-svg")
        .attr("width", vis.visDimensions.width)
        .attr("height", vis.visDimensions.height);

    // Set up groups for nodes/links
    vis.svg.append("g").attr("class", "links");
    vis.svg.append("g").attr("class", "nodes");

    // Add tooltip
    d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // Set up the colorClasses (names of the tables) so we can assign colors based on index later
    for (node of vis.graph_structure.nodes) {
        // Get the table name
        table = node.id.split("/")[0]

        // If we haven't seen it, push it to the colorClasses array
        if (!vis.colorClasses.includes(table)) {
            vis.colorClasses.push(table)
        }
    }

    // Call update vis to append all the data to the svg
    updateVis(vis.graph_structure)
}

function initializeProvenance(graph_structure) {
    // pass in workerID to setupProvenance
    setUpProvenance(graph_structure.nodes);

    setUpObserver("selected", highlightSelectedNodes);

    update();
}

function highlightSelectedNodes(state) {
    // see if there is at least one node 'clicked'
    //check state not ui, since ui has not yet been updated
    let hasUserSelection = state.selected.length > 0;

    //set the class of everything to 'muted', except for the selected node and it's neighbors
    d3.select(".nodes")
        .selectAll(".nodeGroup")
        .classed("muted", d => {
            return (
                hasUserSelection &&
                !state.selected.includes(d.id) &&
                !state.userSelectedNeighbors.includes(d.id) //this id exists in the dict
            );
        });

    // Set the class of a clicked node to clicked
    d3.select(".nodes")
        .selectAll(".node")
        .classed("clicked", d => state.selected.includes(d.id))


    d3.select(".links")
        .selectAll(".linkGroup")
        .classed(
            "muted",
            d =>
            hasUserSelection &&
            !state.userSelectedEdges.includes(d.id)
        )
        .select('path')
        .style("stroke", vis.edgeColor);
}

function nodeFill(node) {
    index = vis.colorClasses.findIndex(d => { return d === node.id.split("/")[0] }) % 5
    return vis.nodeColors[index]
}

function selectNode(node) {
    d3.event.stopPropagation();
    const currentState = app.currentState();

    //find out if this node was selected before;
    let selected = currentState.hardSelected;
    let wasSelected = selected.includes(node.id);

    if (wasSelected) {
        selected = selected.filter(s => s !== node.id);
    } else {
        selected.push(node.id);
    }

    let label = wasSelected ? "Hard Unselected a Node" : "Hard Selected a Node";

    let action = {
        label: label,
        action: () => {
            const currentState = app.currentState();
            //add time stamp to the state graph
            currentState.time = Date.now();
            //Add label describing what the event was
            currentState.event = label;
            //Update actual node data
            currentState.hardSelected = selected;
            return currentState;
        },
        args: []
    };

    provenance.applyAction(action);
}

function dragNode() {
    d3.selectAll(".linkGroup")
        .select("path")
        .attr("d", d => arcPath(1, d));

    // Get the total space available on the svg
    let horizontalSpace = vis.visDimensions.width - vis.visMargins.right - vis.nodeMarkerLength;
    let verticalSpace = vis.visDimensions.height - vis.visMargins.top - vis.nodeMarkerHeight;

    // Don't allow nodes to be dragged off the main svg area
    d3.selectAll(".nodeGroup").attr("transform", d => {
        d.x = Math.max(vis.visMargins.left, Math.min(horizontalSpace, d.x));
        d.y = Math.max(vis.visMargins.top, Math.min(verticalSpace, d.y));
        return "translate(" + d.x + "," + d.y + ")";
    });
}

function arcPath(leftHand, d, state = false) {
    let source = state ? { x: state.nodePos[d.source.id].x, y: state.nodePos[d.source.id].y } :
        d.source;
    let target = state ? { x: state.nodePos[d.target.id].x, y: state.nodePos[d.target.id].y } :
        d.target;

    if (!vis.simOn) {
        source = vis.graph_structure.nodes.find(x => x.id === source)
        target = vis.graph_structure.nodes.find(x => x.id === target)
    }

    var x1 = leftHand ? parseFloat(source.x) + vis.nodeMarkerLength / 2 : target.x,
        y1 = leftHand ? parseFloat(source.y) + vis.nodeMarkerHeight / 2 : target.y,
        x2 = leftHand ? parseFloat(target.x) + vis.nodeMarkerLength / 2 : source.x,
        y2 = leftHand ? parseFloat(target.y) + vis.nodeMarkerHeight / 2 : source.y;

    horizontalSpace = vis.visDimensions.width - vis.visMargins.left - vis.visMargins.right - vis.nodeMarkerLength;
    verticalSpace = vis.visDimensions.height - vis.visMargins.bottom - vis.visMargins.top - vis.nodeMarkerHeight;
    x1 = Math.max(vis.visMargins.left + vis.nodeMarkerLength / 2, Math.min(horizontalSpace + vis.visMargins.left + vis.nodeMarkerLength / 2, x1));
    y1 = Math.max(vis.visMargins.top + vis.nodeMarkerHeight / 2, Math.min(verticalSpace + vis.visMargins.top + vis.nodeMarkerHeight / 2, y1));
    x2 = Math.max(vis.visMargins.left + vis.nodeMarkerLength / 2, Math.min(horizontalSpace + vis.visMargins.left + vis.nodeMarkerLength / 2, x2));
    y2 = Math.max(vis.visMargins.top + vis.nodeMarkerHeight / 2, Math.min(verticalSpace + vis.visMargins.top + vis.nodeMarkerHeight / 2, y2));

    dx = x2 - x1
    dy = y2 - y1
    dr = Math.sqrt(dx * dx + dy * dy)
    drx = dr
    dry = dr
    sweep = 1
    xRotation = 0
    largeArc = 0

    console.log(vis.straightEdges)

    if (vis.straightEdges) {
        return (
            'M ' + x1 + ' ' + y1 + ' L ' + x2 + ' ' + y2);
    } else {
        return (
            "M" +
            x1 +
            "," +
            y1 +
            "A" +
            drx +
            ", " +
            dry +
            " " +
            xRotation +
            ", " +
            largeArc +
            ", " +
            sweep +
            " " +
            x2 +
            "," +
            y2
        );
    }
}

function showTooltip(data, delay = 200) {
    let tooltip = d3.select('.tooltip');

    tooltip.html(data)
        .style("left", (window.event.clientX + 10) + "px")
        .style("top", (window.event.clientY - 20) + "px");

    tooltip.transition().duration(delay).style("opacity", .9);

}

function hideTooltip() {
    d3.select('.tooltip').transition().duration(100).style("opacity", 0);
}

function updateVis(graph_structure) {

    //setGlobalScales();

    //create scales for bars;
    // let barAttributes = config.nodeAttributes.filter(isQuant);

    // barAttributes.map((b, i) => {
    //     let scale = d3
    //         .scaleLinear()
    //         .domain(config.attributeScales.node[b].domain)
    //         .range([0, nodeMarkerHeight - 2 * barPadding])
    //         .clamp(true);

    //     //save scale and color to use with that attribute bar
    //     scales[b] = { scale, domainKey };
    // });

    // let singleDomain = Object.keys(scaleColors).length === 1;
    //Assign one color per unique domain;

    // Object.keys(scales).map(
    //     s => (scales[s].fill = scaleColors[scales[s].domainKey])
    // );



    // Draw graph

    // Draw nodes
    //let drawCat = Object.keys(config.nodeAttributes.filter(isCategorical)).length > 0;
    let drawCat = 0
    let padding = drawCat ? 3 : 0;

    var node = d3
        .select(".nodes")
        .selectAll(".nodeGroup")
        .data(graph_structure.nodes);

    let nodeEnter = node
        .enter()
        .append("g")
        .attr("class", "nodeGroup")



    nodeEnter.append("rect").attr("class", "nodeBorder nodeBox");
    nodeEnter.append("rect").attr("class", "node nodeBox");


    nodeEnter.append("rect").attr("class", "labelBackground");

    nodeEnter.append("text").classed("label", true);

    node.exit().remove();

    node = nodeEnter.merge(node);

    node.classed("muted", false)
        .classed("selected", false)
        .attr("transform", d => {
            // Get the space we have to work with
            horizontalSpace = vis.visDimensions.width - vis.visMargins.left - vis.visMargins.right - (2 * vis.nodeMarkerLength);
            verticalSpace = vis.visDimensions.height - vis.visMargins.bottom - vis.visMargins.top - (2 * vis.nodeMarkerHeight);

            // If no x,y defined, get a random place in the space we have and bump it over by 1 margin
            d.x = d.x === undefined ? (Math.random() * horizontalSpace) + vis.visMargins.left : Math.max(vis.visMargins.left, Math.min(vis.visDimensions.width - vis.nodeMarkerLength - vis.visMargins.right, d.x));
            d.y = d.y === undefined ? (Math.random() * verticalSpace) + vis.visMargins.top : Math.max(vis.visMargins.top, Math.min(vis.visDimensions.height - vis.nodeMarkerHeight - vis.visMargins.bottom, d.y));
            return "translate(" + d.x + "," + d.y + ")";
        });


    //determine the size of the node here: 
    // let barAttrs = config.nodeLink.drawBars ?
    //     config.nodeAttributes.filter(isQuant) : [];


    // nodeMarkerLength = config.nodeLink.drawBars ? barAttrs.length * 10 + barPadding + radius * 2 + padding : nodeMarkerLength;
    // vis.nodeMarkerLength = false ? barAttrs.length * 10 + barPadding + radius * 2 + padding : vis.nodeMarkerLength;

    // let nodePadding = 2;
    // let sizeDiff = 55 - vis.nodeMarkerLength;
    // let extraPadding = sizeDiff > 0 ? sizeDiff : 0;

    node
        .selectAll(".nodeBox")
        .attr("width", d => vis.nodeMarkerLength)
        .attr("height", d => vis.nodeMarkerHeight)
        .attr("rx", d => vis.nodeMarkerLength / 2)
        .attr("ry", d => vis.nodeMarkerHeight / 2);

    node.select('.node')
        .style("fill", d => nodeFill(d))

    .on("mouseover", function(d) {
        showTooltip(d.id);
    })


    node
        .select("text")
        .text(d => { console.log(vis.nodeLabel); return d[vis.nodeLabel] })
        .style("font-size", vis.nodeFontSize + "pt")
        .attr("dx", d => vis.nodeMarkerLength / 2)
        .attr("dy", d => (vis.nodeMarkerHeight / 2) + 2)

    node
        .select(".labelBackground")
        .attr("y", d => vis.nodeMarkerHeight / 2 - 8)
        .attr("width", d => vis.nodeMarkerLength)
        .attr('height', //config.nodeLink.drawBars ? 16 : 
            "1em")

    // .classed('nested', config.nodeLink.drawBars)
    // .attr("width", function(d) {
    //   let textWidth = d3
    //     .select(d3.select(this).node().parentNode)
    //     .select(".label")
    //     .node()
    //     .getBBox().width;

    //   //make sure label box spans the width of the node
    //   return config.nodeLink.drawBars ? nodeMarkerLength + 30 : d3.max([textWidth, vis.nodeLength(d)])+4;
    // })




    // .attr("x", function(d) {
    //   let textWidth = d3
    //     .select(d3.select(this).node().parentNode)
    //     .select("text")
    //     .node()
    //     .getBBox().width;

    //   //make sure label box spans the width of the node
    //   return config.nodeLink.drawBars ? -nodeMarkerLength / 2 -15  : d3.min([-textWidth / 2, -vis.nodeLength(d) / 2 - 2]);
    // })


    // .attr("x", function(d) {
    //     let nodeLabel = d3
    //         .select(d3.select(this).node().parentNode)
    //         .select("text");

    //     // let textWidth = nodeLabel.node().getBBox().width;

    //     return config.nodeIsRect ? -nodeMarkerLength / 2 - nodePadding / 2 - extraPadding / 2 : -textWidth / 2;

    // })
    // .attr("y", d =>
    //   config.nodeLink.drawBars
    //     ? -(nodeHeight(d) / 2 + 4)
    // )
    // .attr("y", d =>
    //         // config.nodeLink.drawBars ?
    //         -(vis.nodeMarkerHeight / 2) - 11
    //     )
    // .attr("x", -nodeMarkerLength/2 )
    // .attr("x", d => {
    //   // let nodeLabel = d3
    //   //     .select(d3.select(this).node().parentNode)
    //   //     .select("text");

    //   //   let textWidth = nodeLabel.node().getBBox().width;
    //   //   return -textWidth / 2;

    //   return config.nodeIsRect ? -nodeMarkerLength/2 - nodePadding/2 -extraPadding/2  :-vis.nodeLength(d) / 2 - 4;
    // })



    node.call(
        d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    );

    //Draw Links
    let link = d3
        .select(".links")
        .selectAll(".linkGroup")
        .data(graph_structure.links);

    let linkEnter = link
        .enter()
        .append("g")
        .attr("class", "linkGroup");

    linkEnter.append("path").attr("class", "links");

    linkEnter
        .append("text")
        .attr("class", "edgeArrow")
        .attr("dy", 4)
        .append("textPath")
        .attr("startOffset", "50%");

    link.exit().remove();

    link = linkEnter.merge(link);


    link.classed("muted", false);

    link
        .select("path")
        .style("stroke-width", 10)
        .style("stroke", vis.edgeColor)
        .attr("id", d => d._key)
        .attr("d", d => arcPath(1, d))
        .on("mouseover", function(d) {
            let tooltipData = d.id;

            // Add the width attribute to the tooltip
            if (vis.attributes.edgeWidthKey) {
                tooltipData = tooltipData.concat(" [" + d[vis.attributes.edgeWidthKey] + "]")
            }

            showTooltip(tooltipData, 400)


        })

    .on("mouseout", function(d) {
        hideTooltip();
    })

    // TODO , set ARROW DIRECTION DYNAMICALLY
    // link
    //     .select("textPath")
    //     .attr("xlink:href", d => "#" + d.id)
    //     .text(d => (vis.isDirected ? (true ? "▶" : "◀") : ""))
    //     .style("fill", vis.edgeColor)
    //     .style("stroke", vis.edgeColor)


    //Drawing Nested Bar Charts

    // //  Separate enter/exit/update for bars so as to bind to the correct data;

    // let xPos = drawCat ? nodeMarkerLength / 2 - radius : 0;

    // let numBars = barAttrs.length;
    // let nodeWidth = nodeMarkerLength - barPadding - radius * 2 - padding;
    // let barWidth = nodeWidth / numBars - barPadding;

    // let scaleStart = -nodeMarkerLength / 2 + barPadding;
    // let scaleEnd = scaleStart + (numBars - 1) * (barWidth + barPadding);

    // let barXScale = d3
    //     .scaleLinear()
    //     .domain([0, numBars - 1])
    //     .range([scaleStart, scaleEnd]);

    // let bars = node
    //     .selectAll(".bars")
    //     //for each bar associate the relevant data from the parent node, and the attr name to use the correct scale
    //     .data(
    //         d =>
    //         barAttrs.map(b => {
    //             return { data: d[b], attr: b };
    //         }),
    //         d => d.attr
    //     );

    // let barsEnter = bars
    //     .enter()
    //     .append("g")
    //     .attr("class", "bars");

    // barsEnter
    //     .append("rect")
    //     .attr("class", "frame")
    //     .append("title");

    // barsEnter
    //     .append("rect")
    //     .attr("class", "bar")
    //     .append("title");

    // bars.exit().remove();

    // bars = barsEnter.merge(bars);

    // bars.selectAll("rect").attr("width", barWidth);

    // // bars.selectAll("title").text(function(d) {
    // //   return d.attr + " : " + d.data;
    // // });

    // bars.on("mouseover", function(d) {
    //     let label = config.attributeScales.node[d.attr].label
    //     showTooltip(label + " : " + Math.round(d.data))
    // })

    // bars.attr("transform", (d, i) => {
    //     return "translate(" + barXScale(i) + ",2)";
    // });

    // bars
    //     .select(".frame")
    //     .attr("height", d => scales[d.attr].scale.range()[1])
    //     .attr("y", d => -scales[d.attr].scale.range()[1] / 2)
    //     .style("stroke", d => scales[d.attr].fill);

    // bars
    //     .select(".bar")
    //     .classed("clipped", d => d.data > scales[d.attr].scale.domain()[1])
    //     .attr("height", d => scales[d.attr].scale(d.data))
    //     .attr(
    //         "y",
    //         d => nodeMarkerHeight / 2 - barPadding - scales[d.attr].scale(d.data)
    //     )
    //     .style("fill", d => scales[d.attr].fill);

    // d3.select("#nodeBarsSelect")
    //     .selectAll("label")
    //     .style("color", "#a6a6a6")
    //     .style("font-weight", "normal");

    // //color the text from the panel accordingly
    // d3.select("#nodeQuantSelect")
    //     .selectAll("label")
    //     .style("color", d =>
    //         barAttrs.includes(d.attr) ? scales[d.attr].fill : "#b2afaf"
    //     )
    //     .style("font-weight", "bold");

    // let catAttrs = config.nodeLink.drawBars ?
    //     config.nodeAttributes.filter(isCategorical) : [];

    // let yRange =
    //     catAttrs.length < 2 ? [1, 1] : [-nodeMarkerHeight * 0.2 + 1, nodeMarkerHeight * 0.2 + 1];

    // let catYScale = d3
    //     .scaleLinear()
    //     .domain([0, catAttrs.length - 1])
    //     .range(yRange);

    // let catGlyphs = node
    //     .selectAll(".categorical")
    //     //for each circle associate the relevant data from the parent node
    //     .data(
    //         d =>
    //         catAttrs.map(attr => {
    //             let valuePos = config.attributeScales.node[attr].domain.indexOf(
    //                 d[attr]
    //             );
    //             return {
    //                 data: d[attr],
    //                 attr,
    //                 label: config.attributeScales.node[attr].legendLabels[valuePos]
    //             };
    //         }),
    //         d => d.attr
    //     );

    // let catGlyphsEnter = catGlyphs
    //     .enter()
    //     .append("g")
    //     .attr("class", "categorical");

    // catGlyphsEnter.append("rect");
    // catGlyphsEnter.append("text");

    // catGlyphs.exit().remove();

    // catGlyphs = catGlyphsEnter.merge(catGlyphs);

    // catGlyphs.on("mouseover", function(d) {
    //     showTooltip(d.attr + ":" + d.data)
    // })


    // catGlyphs.attr(
    //     "transform",
    //     (d, i) =>
    //     "translate(" + (xPos - radius) + "," + (catYScale(i) - radius) + ")"
    // );
    // // .attr("x", xPos - radius)
    // // .attr("y", (d, i) => catYScale(i) - radius)

    // catGlyphs
    //     .select("rect")
    //     .style("fill", d => catFill(d.attr, d.data))
    //     .attr("width", d =>
    //         config.attributeScales.node[d.attr].type === "Text" ?
    //         radius * 2 :
    //         radius * 2
    //     )
    //     .attr("height", radius * 2)
    //     .attr("rx", d =>
    //         config.attributeScales.node[d.attr].glyph === "square" ? 0 : radius * 2
    //     )
    //     .attr("ry", d =>
    //         config.attributeScales.node[d.attr].glyph === "square" ? 0 : radius * 2
    //     );

    // catGlyphs
    //     .select("text")
    //     // .text(d=>config.attributeScales.node[d.attr].glyph === 'square' ? d.label : '')
    //     .attr("y", radius * 2)
    //     .attr("x", radius * 2)
    //     .style("text-anchor", "start");

    // If the simulation is requested build and start it
    if (vis.simOn) {
        makeSimulation()
    } else {
        d3.select("#start-simulation").on("click", () => {
            makeSimulation()
            vis.simOn = true;
            vis.simulation.restart()
        });
    }

    d3.select("#exportGraph").on("click", () => {
        let graphCopy = JSON.parse(JSON.stringify(graph_structure));
        console.log(multinet.graph_structure)
    });

    node.on("mouseout", () => {
        hideTooltip()
    })

    node.on("click", d => nodeClick(d));

    //Flag to distinguish a drag from a click.
    let wasDragged = false;

    function dragstarted(d) {
        // if (!d3.event.active) vis.simulation.alphaTarget(0.1).restart();
        d.fx = d.x;
        d.fy = d.y;
        // dragging = true;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
        d.x = d3.event.x;
        d.y = d3.event.y;
        dragNode();
        wasDragged = true;
    }

    function dragended(d) {
        if (wasDragged) {
            //update node position in state graph;
            // updateState("Dragged Node");

            let action = {
                label: "Dragged Node",
                action: () => {
                    const currentState = app.currentState();
                    //add time stamp to the state graph
                    currentState.time = Date.now();
                    //Add label describing what the event was
                    currentState.event = "Dragged Node";
                    //Update node positions
                    graph_structure.nodes.map(
                        n => (currentState.nodePos[n.id] = { x: n.x, y: n.y })
                    );
                    return currentState;
                },
                args: []
            };

            provenance.applyAction(action);
        }
        wasDragged = false;
    }

    // drawLegend();
}

// function drawLegend() {
//     //draw legend based on config;

//     let legendElement = d3
//         .select("#legend-svg")
//         .selectAll(".legendGroup")
//         .data(["upperGroup", "lowerGroup"], d => d);

//     let legendElementEnter = legendElement
//         .enter()
//         .append("g")
//         .attr("class", "legendGroup");

//     legendElement.exit().remove;

//     legendElement = legendElementEnter.merge(legendElement);
//     legendElement.attr("class", d => d + " legendGroup");

//     let legend = {
//         width: d3.select("#legend-svg").attr("width"),
//         height: d3.select("#legend-svg").attr("height"),
//         padding: 10
//     };

//     let drawBars = //config.nodeLink.drawBars || 
//         false;

//     let quantAttributes = drawBars ? config.nodeAttributes.filter(isQuant) : [];
//     let catAttributes = drawBars ?
//         config.nodeAttributes.filter(isCategorical) : [];

//     let colorAttribute = config.nodeLink.nodeFillAttr;
//     let sizeAttribute = drawBars ? [] : config.nodeLink.nodeSizeAttr;
//     let edgeAttribute = config.nodeLink.edgeWidthAttr;

//     let edgeStrokeScale = d3
//         .scaleOrdinal()
//         .domain(config.attributeScales.edge["type"].domain)
//         .range(config.attributeScales.edge["type"].range);

//     let edgeAttributeValues = edgeAttribute ? config.attributeScales.edge[edgeAttribute].domain : false;
//     let edgeTypes = config.isMultiEdge ? ["mentions", "retweet"] : [];

//     let colorAttributeValues =
//         drawBars || !colorAttribute ? [] :
//         config.attributeScales.node[config.nodeLink.nodeFillAttr].legendLabels;

//     let sizeAttributeValues = drawBars || !config.nodeLink.nodeSizeAttr ? [] :
//         config.attributeScales.node[config.nodeLink.nodeSizeAttr].domain;

//     let barWidth = 20;
//     let barPadding = 30;
//     let barHeight = 70;

//     let circleRadius = 40;
//     let circlePadding = 10;

//     let squarePadding = 10;

//     let labelRotate = -90;

//     let squareSize = barHeight * 0.3;

//     // let yRange =
//     //     catAttributes.length < 2
//     //     ? [barHeight/2, barHeight/2]
//     //     : [barHeight/4, barHeight*0.75];

//     // let yScale = d3
//     //   .scaleLinear()
//     //   .domain([0, catAttributes.length - 1])
//     //   .range(yRange);

//     let format = d3.format("2.2s");

//     let upperGroup = d3.select(".upperGroup");
//     let lowerGroup = d3.select(".lowerGroup");

//     let upperGroupElement;
//     // let lowerGroupElement

//     // draw nestedBars legend

//     let bars = upperGroup
//         .selectAll(".legendBar")
//         //for each bar associate the relevant data from the parent node, and the attr name to use the correct scale
//         .data(quantAttributes, d => d);

//     let barsEnter = bars
//         .enter()
//         .append("g")
//         .attr("class", "legendBar");

//     barsEnter
//         .append("rect")
//         .attr("class", "frame")
//         .append("title");

//     barsEnter.append("rect").attr("class", "bar");
//     barsEnter.append("text").attr("class", "legendLabel");
//     barsEnter.append("text").attr("class", "domainEnd");

//     bars.exit().remove();

//     bars = barsEnter.merge(bars);

//     bars.selectAll("rect").attr("width", barWidth);

//     bars.attr("transform", (d, i) => {
//         return "translate(" + i * (barWidth + barPadding) + ",0)";
//     });

//     bars
//         .select(".frame")
//         .attr("height", barHeight)
//         .attr("y", -barHeight)
//         .attr("x", 18)
//         .style("stroke", d => scales[d].fill);

//     bars
//         .select(".bar")
//         .attr("height", barHeight * 0.7)
//         .attr("y", -barHeight * 0.7)
//         .attr("x", 18)
//         .style("fill", d => scales[d].fill);

//     bars
//         .select(".legendLabel")
//         .text(d => config.attributeScales.node[d].label)
//         // .attr("transform", "translate(" + barWidth/2 + "," + (-barHeight-5) +")")
//         .attr("transform", "translate(10,0) rotate(" + labelRotate + ")")
//         .style("text-anchor", "start")
//         // .style("fill","white")
//         .style("font-weight", "bold");
//     // .style("font-size",barWidth/2)

//     bars
//         .select(".domainEnd")
//         .text(d => format(config.attributeScales.node[d].domain[1]))
//         // .attr("transform", "translate(" + (barWidth+3) + "," + (-barHeight+10) +")")
//         .attr(
//             "transform",
//             "translate(" + (barWidth / 2 + 18) + "," + (-barHeight - 5) + ")"
//         )
//         .style("text-anchor", "middle");

//     let catLegend = lowerGroup
//         .selectAll(".catLegend")
//         //for each bar associate the relevant data from the parent node, and the attr name to use the correct scale
//         .data(catAttributes, d => d);

//     let catLegendEnter = catLegend
//         .enter()
//         .append("g")
//         .attr("class", "catLegend");

//     // squaresEnter.append("rect").attr("class", "square");

//     catLegendEnter.append("text").attr("class", "catLabel");
//     catLegendEnter.append("g").attr("class", "categoricalScale");

//     catLegend.exit().remove();

//     catLegend = catLegendEnter.merge(catLegend);

//     catLegend
//         .select(".catLabel")
//         .text(d => config.attributeScales.node[d].label)
//         // .attr("transform", (d,i)=> "translate(0," + (yScale(i)+squareSize/4) +  ")")
//         .attr("transform", (d, i) => "translate(0,0)")
//         .style("font-weight", "bold")
//         .style("text-anchor", "start");

//     let catGlyphs = catLegend
//         .select(".categoricalScale")
//         .selectAll(".catGlyphs")
//         .data((d, ii) =>
//             config.attributeScales.node[d].domain.map(
//                 (domain, i) => {
//                     return {
//                         pos: ii,
//                         attribute: d,
//                         value: domain,
//                         legendLabel: config.attributeScales.node[d].legendLabels[i],
//                         fill: config.attributeScales.node[d].range[i]
//                     };
//                 },
//                 d => d.attribute
//             )
//         );

//     let catGlyphsEnter = catGlyphs
//         .enter()
//         .append("g")
//         .attr("class", "catGlyphs");

//     catGlyphsEnter.append("rect");
//     catGlyphsEnter.append("text");

//     catGlyphs.exit().remove();

//     catGlyphs = catGlyphsEnter.merge(catGlyphs);

//     catGlyphs.on("mouseover", function(d) {
//         showTooltip(d.value)
//     })

//     catGlyphs.on("mouseout", function(d) {
//         hideTooltip();
//     })


//     catGlyphs
//         .select("rect")
//         .attr("width", squareSize)
//         .attr("height", squareSize)
//         .attr("rx", d =>
//             config.attributeScales.node[d.attribute].glyph === "square" ?
//             0 :
//             squareSize * 2
//         )
//         .attr("ry", d =>
//             config.attributeScales.node[d.attribute].glyph === "square" ?
//             0 :
//             squareSize * 2
//         )

//     .attr("fill", d => d.fill);

//     catGlyphs
//         .select("text")
//         .text(d => d.legendLabel)
//         .attr(
//             "transform",
//             d => "translate(" + (squareSize + 3) + "," + squareSize / 2 + ")"
//         )
//         .style("text-anchor", "start");

//     // .attr("transform",d=> "translate(" + (d.legendLabel.length<3?  0: squareSize) + "," + (d.pos === 0 ? -5 : d.legendLabel.length> 2 ? squareSize+5 : squareSize*1.7) + ") rotate(" + (d.legendLabel.length>2? labelRotate  : 0) + ")")
//     // .style("text-anchor",d=>d.legendLabel.length>2 && d.pos === 1 ? "end":"start")

//     // catGlyphs.attr("transform", (d, i) => {
//     //   return "translate(" + i*(squareSize + squarePadding) + "," + (yScale(d.pos)-barHeight-squareSize/2) + ")";
//     // });

//     catGlyphs.attr("transform", (d, i) => {
//         return "translate(0," + (i * (squareSize + squarePadding) + 10) + ")";
//     });

//     // catLegend.select('text')
//     // .text(d=>d.value)
//     // .attr("transform",d=> "translate(" + (squareSize+2) + "," + squareSize + ") rotate(0)")
//     // // .style("text-anchor",d=>d.pos === 0 ? "start":"end")

//     catLegend.attr("transform", (d, i) => {
//         return "translate(" + i * 80 + ",0)";
//     });

//     //draw color/size legend

//     let circles = upperGroup
//         .selectAll(".legendBarCircles")
//         //for each bar associate the relevant data from the parent node, and the attr name to use the correct scale
//         .data(
//             colorAttributeValues.map((c, i) => {
//                 return {
//                     label: c,
//                     fill: config.attributeScales.node[colorAttribute].range[i],
//                     value: config.attributeScales.node[colorAttribute].domain[i],
//                 };
//             })
//         );

//     let circlesEnter = circles
//         .enter()
//         .append("g")
//         .attr("class", "legendBarCircles");

//     circlesEnter.append("rect").attr("class", "circle");

//     circlesEnter.append("text").attr("class", "legendLabel");

//     circles.exit().remove();

//     circles = circlesEnter.merge(circles);

//     circles.attr("transform", (d, i) => {
//         return "translate(" + i * (circleRadius + circlePadding) + ",0)";
//     });

//     circles
//         .select(".circle")
//         .attr("height", circleRadius)
//         .attr("width", circleRadius)
//         // .attr("y", -circleRadius-20)
//         .style("fill", d => d.fill)
//         .attr("rx", circleRadius)
//         .attr("ry", circleRadius);

//     circles
//         .select(".legendLabel")
//         .text(d => d.label)
//         .attr(
//             "transform",
//             "translate(" + circleRadius / 2 + "," + (circleRadius / 2 + 5) + ")"
//         )
//         .style("text-anchor", "middle")
//         .style("font-weight", "bold")
//         .style("fill", "white");

//     circles.on("mouseover", function(d) {
//         showTooltip(d.value)
//     })

//     circles.on("mouseout", function(d) {
//         hideTooltip();
//     })


//     //render lower group in legend.

//     let lowerLegendGroups = [];

//     if (!drawBars && sizeAttribute) {
//         lowerLegendGroups.push({
//             label: config.attributeScales.node[sizeAttribute].label,
//             domain: sizeAttributeValues,
//             type: "node"
//         })
//     }

//     if (edgeAttributeValues) {
//         lowerLegendGroups.push({
//             label: config.attributeScales.edge[edgeAttribute].label,
//             domain: edgeAttributeValues,
//             type: "edgeWidth"
//         })
//     }
//     if (config.isMultiEdge) {
//         lowerLegendGroups.push({
//             label: config.attributeScales.edge.type.label,
//             domain: edgeTypes,
//             type: "edgeType"
//         });
//     }

//     let node_link_legend = lowerGroup
//         .selectAll(".node_link_legend")
//         .data(lowerLegendGroups);

//     let node_link_legendEnter = node_link_legend
//         .enter()
//         .append("g")
//         .attr("class", "node_link_legend");

//     node_link_legend.exit().remove();

//     node_link_legend = node_link_legendEnter.merge(node_link_legend);

//     //compute width of all .catLegend groups first:
//     let catLegendWidth = 0;

//     d3.selectAll(".catLegend").each(function() {
//         catLegendWidth =
//             catLegendWidth +
//             d3
//             .select(this)
//             .node()
//             .getBBox().width;
//     });

//     node_link_legend.attr(
//         "transform",
//         (d, i) =>
//         "translate(" + (catLegendWidth + 20 + i * legend.width * 0.35) + ",0)"
//     );

//     //add label to each group

//     let label = node_link_legend.selectAll(".axisLabel").data(d => [d.label]);

//     let labelEnter = label
//         .enter()
//         .append("text")
//         .attr("class", "axisLabel");

//     label.exit().remove();

//     label = labelEnter.merge(label);

//     label.text(d => d.label);

//     let sizeCircles = node_link_legend
//         .selectAll(".sizeCircles")
//         //for each bar associate the relevant data from the parent node, and the attr name to use the correct scale
//         .data(d =>
//             d.domain.map(domain => {
//                 return { data: domain, type: d.type };
//             })
//         );

//     let sizeCirclesEnter = sizeCircles
//         .enter()
//         .append("g")
//         .attr("class", "sizeCircles");

//     sizeCirclesEnter.append("rect").attr("class", "sizeCircle");
//     sizeCirclesEnter.append("text").attr("class", "sizeCircleLabel");

//     sizeCircles.exit().remove();

//     sizeCircles = sizeCirclesEnter.merge(sizeCircles);

//     sizeCircles.attr("transform", (d, i) => {
//         let radius = d.type === "node" ? 35 : d.type === "edgeType" ? 0 : 50;
//         let yOffset = d.type === "edgeType" ? 50 : 0;
//         return "translate(" + i * radius + "," + i * yOffset + ")";
//     });



//     let findCenter = function(i) {
//         return vis.circleScale.range()[1] / 2 - vis.circleScale(i) / 2;
//     };

//     sizeCircles
//         .select(".sizeCircle")
//         .attr("height", (d, i) => d.type === "edgeType" ?
//             edgeScale(1) :
//             d.type === "edgeWidth" ?
//             edgeScale(i) :
//             vis.circleScale(i)
//         )
//         .attr("width", (d, i) => (d.type === "node" ? vis.circleScale(i) : 30))
//         .attr("y", (d, i) =>
//             d.type === "node" ?
//             findCenter(i) + 5 :
//             d.type === "edgeWidth" ?
//             vis.circleScale.range()[1] / 2 + 5 :
//             vis.circleScale.range()[1] / 2 - 5
//         )
//         .attr("rx", (d, i) => (d.type === "node" ? vis.circleScale(i) : 0))
//         .attr("ry", (d, i) => (d.type === "node" ? vis.circleScale(i) : 0))
//         .style("fill", d => (d.type === "edgeType" ? edgeStrokeScale(d.data) : ""))
//         .classed("edgeLegend", (d, i) => d.type === "edgeType");

//     sizeCircles
//         .select(".sizeCircleLabel")
//         .text(d => d.data)
//         .attr(
//             "transform",
//             (d, i) =>
//             "translate(" +
//             (d.type === "node" ?
//                 vis.circleScale(i) / 2 :
//                 d.type === "edgeWidth" ?
//                 edgeScale(i) :
//                 0) +
//             "," +
//             (d.type === "edgeType" ?
//                 vis.circleScale.range()[1] / 2 + 20 :
//                 vis.circleScale.range()[1] + 25) +
//             ")"
//         )
//         .style("text-anchor", "start")
//         .style("font-weight", "bold");

//     node_link_legend
//         .select(".axisLabel")
//         .style("text-anchor", "start")
//         .style("font-weight", "bold")
//         .text(d => d.label)
//         // .text(d=>{return config.attributeScales.node[d.label].label})
//         // .attr('x',circleScale(sizeAttributeValues[1]))
//         .attr("y", 0);

//     //center group with circles;
//     upperGroupElement = d3
//         .select(".upperGroup")
//         .node()
//         .getBBox();
//     lowerGroupElement = d3
//         .select(".lowerGroup")
//         .node()
//         .getBBox();

//     // d3.select('.upperGroup').attr("transform","translate(" + (legend.width/2 - upperGroupElement.width/2) + "," +  (drawBars ? barHeight + 20 : 10) + ")");
//     // d3.select('.lowerGroup').attr("transform","translate(" + (legend.width/2 - lowerGroupElement.width/2) + "," +  (legend.height-10) + ")");

//     // let longerLabel = 15;
//     // d3.selectAll('.squareLabel').each(function(){
//     //   longerLabel = d3.max([longerLabel,d3.select(this).node().getBBox().width+15]);
//     //   })
//     // let lowerTranslate = !drawBars ? 0 : longerLabel ;

//     d3.select(".upperGroup").attr(
//         "transform",
//         "translate(15," + (drawBars ? barHeight + 20 : 30) + ")"
//     );
//     d3.select(".lowerGroup").attr(
//         "transform",
//         "translate(0," + (drawBars ? upperGroupElement.height + 30 : 100) + ")"
//     );
// };

function makeSimulation() {
    vis.simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id))
        .force("charge", d3.forceManyBody().strength(1))
        .force(
            "center",
            d3.forceCenter(vis.visDimensions.width / 2, vis.visDimensions.height / 2)
        )

    vis.simulation
        .nodes(vis.graph_structure.nodes)

    vis.simulation
        .force("link")
        .links(vis.graph_structure.links);

    vis.simulation
        .force("center");

    vis.simulation
        .on("tick", d => {
            ticked(d)
        });


    vis.simulation.force(
        "collision",
        d3.forceCollide().radius(d => {
            return d3.max([vis.nodeMarkerLength / 2, vis.nodeMarkerHeight / 2]) * 1.5
        }).strength(0.5)
    );

    function ticked(d) {
        dragNode();
    }

    // Start the simulation with an alpha target and an alpha min 
    // that's a little larger so the sim ends
    vis.simulation.alphaMin(0.025)
    vis.simulation.alphaTarget(0.02).restart();

    // UI for the simulation
    d3.select("#stop-simulation").on("click", () => {
        vis.simulation.stop();
        vis.graph_structure.nodes.map(n => {
            n.savedX = n.x;
            n.savedY = n.y;
        });
    });

    d3.select("#start-simulation").on("click", () => {
        // Reset the alpha of the simulation and re-run it
        console.log("clicked simulation")
        vis.simulation.alpha(0.5);
        vis.simulation.alphaTarget(0.02).restart();
    });

    d3.select("#release-nodes").on("click", () => {
        // Release the pinned nodes
        vis.graph_structure.nodes.map(n => {
            n.fx = null;
            n.fy = null;
        });
        // Reset the alpha of the simulation and re-run it
        vis.simulation.alpha(0.5);
        vis.simulation.alphaTarget(0.02).restart();
    });
}


module.exports = { initializeProvenance };