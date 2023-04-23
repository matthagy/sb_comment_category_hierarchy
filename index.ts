import * as d3 from "d3";
import {node_data, NodeData} from "./nodes";
import {BaseType} from "d3";

class Node {
    id: string;
    titles: string[];
    count: number;
    children: Node[];
    visible: boolean = true;
    childCollapses: boolean = false;

    constructor(id: string, titles: string[], count: number, children: Node[]) {
        this.id = id;
        this.titles = titles;
        this.count = count;
        this.children = children;
    }

    getChildren(): Node[] {
        return this.children;//.filter(c => c.visible);
    }

    toggleChildrenVisible(collapse?: boolean): void {
        if (collapse === undefined) {
            collapse = !this.childCollapses;
            // console.log(`toggleChildrenVisible ${this.title} collapse=${collapse} visible=${this.visible}`);
        }
        this.childCollapses = collapse;
        for (const child of this.children) {
            child.visible = !collapse;
            child.toggleChildrenVisible(collapse);
        }
    }
}

function createNode(data: NodeData): Node {
    return new Node(data.id, data.titles, data.count, (data.children ?? []).map(createNode));
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
    .nodeSize([30, 320])
;


let rootNode = d3.hierarchy(topLevelNode, d => d.getChildren())
let layoutNode = treeLayout(rootNode);

type NodeSelectionType = d3.Selection<BaseType, d3.HierarchyPointNode<Node>, SVGGElement, unknown>;
type LinkPathType = d3.Selection<SVGPathElement, d3.HierarchyPointNode<Node>, SVGGElement, unknown>
type NodePathType = d3.Selection<SVGGElement, d3.HierarchyPointNode<Node>, SVGGElement, unknown>
type NodeShapeType = d3.Selection<SVGCircleElement, d3.HierarchyPointNode<Node>, SVGGElement, unknown>
type NodeTextType = d3.Selection<SVGTextElement, d3.HierarchyPointNode<Node>, SVGGElement, unknown>

function selectLinks(): NodeSelectionType {
    return g.selectAll(".link")
        .data(layoutNode.descendants().slice(1));
}

function selectNodes(): NodeSelectionType {
    return g
        .selectAll(".node")
        .data(layoutNode.descendants());
}

function linkAppend(selection: NodeSelectionType): LinkPathType {
    return selection
        .enter()
        .append("path");
}

function nodeAppend(selection: NodeSelectionType): NodePathType {
    return selection
        .enter()
        .append("g");
}

function linkStyle(selection: LinkPathType): LinkPathType {
    return selection
        .style("stroke", "#ccc")
        .style("stroke-width", 3)
        .attr("fill", "none")
        //.attr("r", 3)
        .attr("class", "link")
        .attr("opacity", d => d.data.visible ? 0.25 : 0)
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
}

function nodeStyle(selection: NodePathType): NodePathType {
    return selection
        .attr("class", "node")
        .attr("transform", d => "translate(" + d.y + "," + d.x + ")");
}

function nodeShapeAppend(selection: NodePathType): NodeShapeType {
    return selection
        .append("circle");
}

function nodeRadius(d: d3.HierarchyPointNode<Node>) {
    return 2.3 * Math.sqrt(d.data.count);
}

function nodeShapeStyle(selection: NodeShapeType): NodeShapeType {
    return selection
        .attr("r", d => nodeRadius(d))
        .attr("fill", d => d.data.children.length > 0 ? "steelblue" : "orange")
        .attr("opacity", d => d.data.visible ? 1 : 0)
        .on("click", (e, d) => {
            if (e.ctrlKey) {
                console.log(`Clicked w/ Control ${d.data.titles[0]} ${d.data.visible}}`);
                d.data.toggleChildrenVisible();
                update();
            } else {
                console.log(`Bare clicked ${d.data.titles[0]} ${d.data.visible}}`);
            }
        });
}

function nodeTextAppend(selection: NodePathType): NodeTextType {
    return selection
        .append("text");
}

function nodeTextStyle(selection: NodeTextType): NodeTextType {
    return selection
        .text((d) => `${d.data.titles[0]} (${d.data.count})`)
        .attr("transform", d => `translate(${1.2 * nodeRadius(d)},5)`)
        .attr("opacity", d => d.data.visible ? 1 : 0);
}


let existingLink = linkStyle(linkAppend(selectLinks()));
let existingNode = nodeStyle(nodeAppend(selectNodes()));
let existingNodeShape = nodeShapeStyle(nodeShapeAppend(existingNode));
let existingNodeText = nodeTextStyle(nodeTextAppend(existingNode));

function update() {
    console.log("update");

    rootNode = d3.hierarchy(topLevelNode, d => d.getChildren());
    layoutNode = treeLayout(rootNode);

    const newLinks = linkAppend(selectLinks());
    const mergeLinks = linkStyle(newLinks.merge(existingLink));
    mergeLinks.exit().remove();
    existingLink = mergeLinks;

    const newNode = nodeAppend(selectNodes());
    const mergeNode = nodeStyle(newNode.merge(existingNode));
    mergeNode.exit().remove();
    existingNode = mergeNode;

    const newNodeShape = nodeShapeAppend(newNode);
    const mergeNodeShape = nodeShapeStyle(newNodeShape.merge(existingNodeShape));
    mergeNodeShape.exit().remove();
    existingNodeShape = mergeNodeShape;

    const newNodeText = nodeTextAppend(newNode);
    const mergeNodeText = nodeTextStyle(newNodeText.merge(existingNodeText));
    mergeNodeText.exit().remove();
    existingNodeText = mergeNodeText;
}

function setInitialVisibility(node: Node, depth: number = 0) {
    if (depth >= 3) {
        node.toggleChildrenVisible();
    } else {
        node.children.forEach(child => setInitialVisibility(child, depth + 1));
    }
}

setInitialVisibility(topLevelNode);
update();

function castPoint(x: any): d3.HierarchyPointNode<Node> {
    return x as d3.HierarchyPointNode<Node>;
}

// Add zoom behavior to the svg element
const zoom = d3
    .zoom<SVGSVGElement, unknown>()
    //.scaleExtent([0.5, 5])
    //.translateExtent([[0, 0], [width, height]])
    .on("zoom", e => {
        // console.log(`Zoom: ${e.transform}`);
        g.attr("transform", e.transform);
        //g.style("stroke-width", 3 / Math.sqrt(e.transform.k));
        //g.selectAll(".node").attr("r", d => Math.sqrt(castPoint(d).data.count) / Math.sqrt(e.transform.k));
        //g.selectAll(".like").attr("r", 3 / Math.sqrt(e.transform.k));
    });
svg.call(zoom);

