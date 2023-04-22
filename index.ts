import * as d3 from "d3";
import {node_data, NodeData} from "./nodes";
import {BaseType} from "d3";

class Node {
    id: string;
    title: string;
    count: number;
    children: Node[];
    visible: boolean = true;

    constructor(id: string, title: string, count: number, children: Node[]) {
        this.id = id;
        this.title = title;
        this.count = count;
        this.children = children;
    }

    getChildren(): Node[] {
        return this.children;//.filter(c => c.visible);
    }

    toggleVisible(): void {
        this.visible = !this.visible;
    }

    toggleChildrenVisible(): void {
        for (const child of this.children) {
            child.toggleVisible();
            child.toggleChildrenVisible();
        }
    }
}

function createNode(data: NodeData): Node {
    return new Node(data.id, data.title ?? "<na>", data.count, (data.children ?? []).map(createNode));
}

const topLevelNode = createNode(node_data);

const width = 1800;
const height = 1200;

const svg = d3
    .select("#tree-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-width / 2, -height / 2, width, height])
    .style("cursor", "crosshair")
    .style("border", "1px solid black")

//    .attr("transform", `translate(${width / 2},${height / 2})`)
;

const g = svg.append("g");

const treeLayout = d3.tree<Node>()
    .size([width, height])
    .nodeSize([20, 300])
;


let rootNode = d3.hierarchy(topLevelNode, d => d.getChildren())
let layoutNode = treeLayout(rootNode);

const links = g.selectAll(".link")
    .data(layoutNode.descendants().slice(1))
    .enter()
    .append("path")
    .style("stroke", "#ccc")
    .attr("fill", "none")
    .attr("r", 3)
    .attr("class", "link")
    .attr("d", d => {
        const parent = d.parent;
        if (!parent) {
            throw new Error("Parent is null");
        }
        return "M" + d.y + "," + d.x
            + "C" + (d.y + parent.y) / 2 + "," + d.x
            + " " + (d.y + parent.y) / 2 + "," + parent.x
            + " " + parent.y + "," + parent.x;
    });

const nodes = g
    .selectAll(".node")
    .data(layoutNode.descendants())
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", d => "translate(" + d.y + "," + d.x + ")");

const nodeCircles = nodes
    .append("circle")
    .attr("r", 10)
    .attr("fill", "steelblue")
    .on("click", (event, d) => {
        console.log(`Clicked ${d.data.title} ${d.data.visible}}`);
        d.data.toggleChildrenVisible();
        update();
    });

const nodeTexts = nodes
    .append("text")
    .text((d) => `${d.data.title} (${d.data.count})`)
    .attr("transform", function (d) {
        return "translate(12,5)";
    });

function update() {
    console.log("update");

    rootNode = d3.hierarchy(topLevelNode, d => d.getChildren());
    layoutNode = treeLayout(rootNode);
    links.data(layoutNode.descendants().slice(1));
    nodes.data(layoutNode.descendants());
    links.attr("opacity", d => d.data.visible ? 0.25 : 0);
    nodeCircles.attr("opacity", d => d.data.visible ? 1 : 0);
    nodeTexts.attr("opacity", d => d.data.visible ? 1 : 0);

}

update();


// Add zoom behavior to the svg element
const zoom = d3
    .zoom<SVGSVGElement, unknown>()
    //.scaleExtent([0.5, 5])
    //.translateExtent([[0, 0], [width, height]])
    .on("zoom", e => {
        // console.log(`Zoom: ${e.transform}`);
        g.attr("transform", e.transform);
        g.style("stroke-width", 3 / Math.sqrt(e.transform.k));
        g.selectAll(".node").attr("r", 5 / Math.sqrt(e.transform.k));
        g.selectAll(".like").attr("r", 3 / Math.sqrt(e.transform.k));
    });
svg.call(zoom);

