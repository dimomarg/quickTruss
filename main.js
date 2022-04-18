//CONSTANTS
const BG_COLOR = "#0b0b0b";
const NODE_COLOR = "#d9d8d8";
const NODE_MOUSED_COLOR = "#ffd204";
const FORCE_COLOR = "#ee2e24";
const BEAM_COLOR = "#a8a19f";
const BEAM_MOUSED_COLOR = NODE_MOUSED_COLOR;
const TENSION_COLOR = "#ee2e24";
const COMPRESSION_COLOR = "#006bec";
const GRID_COLOR = "#231f20";

//CANVAS SETUP

const canvas = document.getElementById('mainCanvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');

let supportX;
let supportY;
let supportXY;
window.onload = function(){
    supportX = document.getElementById("xSup");
    supportY = document.getElementById("ySup");
    supportXY = document.getElementById("xySup");
}

let scrolling = false;
let movingNodes = false;
let movingForce = false;

let solution = {
    isValid : false
}

// EVENTS AND LISTENERS

canvas.addEventListener('mousemove', function(event){
    mouse.update(event);
})

canvas.addEventListener('wheel', function(event){
    event.preventDefault();
    viewPort.zoom -= event.deltaY/10;
})

canvas.addEventListener('keydown', function(event){
    solution.isValid = false;
    let pressedNode = mouse.hoveredNodes[0];
    if (event.code[0] == "K"){ //if key pressed has code beginning with K,therefore Key
        event.preventDefault();
    }
    switch (event.code){

        case "Space": //Scroll
            scrolling = true;
            break;
        case "Delete": //Delete node
        case "Backspace":
        case "KeyD":
            if (pressedNode){
                pressedNode.delete();
            }
            else if (pressedNode = mouse.hoveredBeams[0]){
                pressedNode.delete();
            }
            break;

        case "KeyM": //Move node
            if (pressedNode && !movingNodes){
                pressedNode.changeParent(tempNodes);
                movingNodes = true;
            }
            break;
            
        case "KeyS": //Support node
            if (pressedNode){
                if (pressedNode.support < 3){
                    pressedNode.support++;
                }
                else{
                    pressedNode.support = 0;
                }
            }
            break;
        
        case "KeyF": //Edit force
            movingForce = nodes.getForcesAtCoords(mouse.coords);
            break;
    }
})

canvas.addEventListener('keyup', function(event){
    switch (event.code){
        case "Space":
            scrolling = false;
            break;
        
        case "KeyM":
            while (tempNodes.length > 0){
                tempNodes[0].changeParent(nodes);
            }
            movingNodes = false;
            break;
        
        case "KeyF":
            movingForce = false;
            break;
    }
    solution = new Solution();

})


canvas.onmousedown = function(){ //TODO: package node creation as its own function.
    solution.isValid = 0;
    newNode = new node(viewPort.pixelsToUnits(mouse.coords), tempNodes);
    tempNodes.push(newNode);
    extrudeFrom = mouse.hoveredNodes[0];

    if (extrudeFrom){
        tempBeams.push(new beam([newNode, extrudeFrom], tempBeams));
    }
    else if (extrudeFrom = mouse.hoveredBeams[0]){
        tempBeams.push(new beam([newNode, extrudeFrom.nodes[0]],tempBeams));
        tempBeams.push(new beam([newNode, extrudeFrom.nodes[1]],tempBeams));
    }
    movingNodes = true;
}

canvas.onmouseup = function(){
    let mergeNode;
    movingNodes = false;
    while (tempNodes.length > 0){
        if (mergeNode = mouse.hoveredNodes[0]){
            tempNodes[0].transferBeamsTo(mergeNode);
            tempNodes.splice(0,1);
        }
        else{
            tempNodes[0].changeParent(nodes);
        }
    }
    while (tempBeams.length > 0){
        tempBeams[0].changeParent(beams);
    }
    solution = new Solution();

}

//CLASSES

mouse = { //mouse handler object
    coords : [0,0],
    prevCoords : [0,0],
    hasMoved : false,
    hoveredNodes : [],
    hoveredBeams : [],
    update : function(event){ // called by mousemove
        this.prevCoords = [this.coords[0], this.coords[1]];
        this.coords = [event.x, event.y];
        this.hasMoved = true;

        this.hoveredNodes = [];
        this.hoveredBeams = [];

        this.hoveredNodes.push(nodes.getAtCoords(this.coords));
        this.hoveredBeams.push(beams.getAtCoords(this.coords));
        this.hoveredNodes.push(tempNodes.getAtCoords(this.coords));
        this.hoveredBeams.push(tempBeams.getAtCoords(this.coords));
    },

    getDelta : function(){
        if (this.hasMoved){
            this.hasMoved = false;
            return [this.coords[0] - this.prevCoords[0],
                    this.coords[1] - this.prevCoords[1]];
        }
        else {
            return [0,0];
        }
    }
}


class node{
    constructor(coords, parentArray = nodes){
        this.coords = coords;
        this.parentArray = parentArray;
    }

    beams = [];
    force = [0,0];
    support = 0;

    x(){
        return this.coords[0];
    }
    y(){
        return this.coords[1];
    }

    draw(){
        let drawCoords = viewPort.unitsToPixels(this.coords);
        ctx.beginPath();
        ctx.arc(drawCoords[0], drawCoords[1], 10, 0, 2*Math.PI);
        if (mouse.hoveredNodes.indexOf(this) >= 0){
            ctx.fillStyle = NODE_MOUSED_COLOR;
        }
        else{
            ctx.fillStyle = NODE_COLOR;
        }
        ctx.fill();

        if (this.support){
            let iconCoords = viewPort.unitsToPixels(this.coords);
            let supportIcon;
            switch (this.support){
                case 1:
                    supportIcon = supportX;
                    iconCoords[0] -= 30
                    iconCoords[1] -= 15
                    break;
                case 2:
                    supportIcon = supportY;
                    iconCoords[0] -= 15
                    break;
                case 3:
                    supportIcon = supportXY;
                    iconCoords[0] -= 15
                    break;
            }
            ctx.drawImage(supportIcon, iconCoords[0], iconCoords[1], 30, 30)
        }

        if (this.force[0] != 0 || this.force[1] != 0){ //draw force vector
            let gizmoCoords = this.getForceGizmo();
            ctx.beginPath();
            ctx.moveTo(drawCoords[0], drawCoords[1]);
            ctx.lineTo(gizmoCoords[0], gizmoCoords[1]);
            ctx.lineWidth = 3;
            ctx.strokeStyle = FORCE_COLOR
            ctx.stroke();
        }
    }

    isTouchingPoint(coords){
        let distanceVector = viewPort.unitsToPixels(this.coords);
        distanceVector = [distanceVector[0] - coords[0], distanceVector[1]- coords[1]]
        let distanceSquared = distanceVector[0]*distanceVector[0]
                            + distanceVector[1]*distanceVector[1];
        return distanceSquared < 100;
    }
    
    fGizmoTouchingPoint(coords){
        let x = coords[0] - this.force[0];
        let y = coords[1] - this.force[1];
        return this.isTouchingPoint([x,y]);
    }

    getForceGizmo(){ //returns location of tip of force arrow
        let gizmoCoords = viewPort.unitsToPixels(this.coords);
        gizmoCoords[0] += this.force[0];
        gizmoCoords[1] += this.force[1];
        return gizmoCoords;
    }

    setForceFromGizmo(coords){ //sets force from location of tip of force arrow
        let NodeCoords = viewPort.unitsToPixels(this.coords);
        this.force[0] = coords[0] - NodeCoords[0];
        this.force[1] = coords[1] - NodeCoords[1];
    }


    changeParent(newParent){
        let index = this.parentArray.indexOf(this);
        this.parentArray.splice(index,1);
        
        newParent.push(this);
        this.parentArray = newParent;
    }

    delete(){
        let index = this.parentArray.indexOf(this);
        this.parentArray.splice(index, 1);

        while(this.beams.length > 0){
            this.beams[0].delete();
        }
    }

    transferBeamsTo(target){
        while (this.beams.length>0){
            this.beams[0].replaceConnection(this, target)
        }
        target.cleanBadBeams();
    }

    cleanBadBeams(){ //cleans duplicate and self connecting beams
        let i,j;
        for (i = this.beams.length - 1; i >= 0; --i){
            for (j = i-1; j >= 0; --j){
                if (this.beams[i].isIdentical(this.beams[j])){
                    this.beams[j].delete();
                    --i;
                    //there is no need to check for self connecting beams
                    //beacuse beam.delete() inadvertantly takes care of them.
                }
            }
        }
    }
    tooltip(){

    }
}

class beam{
    constructor(nodes, parentArray = beams){
        this.nodes = nodes;
        nodes[0].beams.push(this);
        nodes[1].beams.push(this);
        this.parentArray = parentArray;
    }

    draw(){
        let startCoords = viewPort.unitsToPixels(this.nodes[0].coords);
        let endCoords = viewPort.unitsToPixels(this.nodes[1].coords);
        ctx.beginPath();
        ctx.moveTo(startCoords[0], startCoords[1]);
        ctx.lineTo(endCoords[0], endCoords[1]);
        ctx.lineWidth = 5;
        let mouseOver = mouse.hoveredBeams.indexOf(this) >= 0;

        if (solution.isValid){
            ctx.strokeStyle = solution.getColor(this.parentArray.indexOf(this));
        }

        else if (mouseOver){
            ctx.strokeStyle = BEAM_MOUSED_COLOR;

        }
        
        else{
            ctx.strokeStyle = BEAM_COLOR;
        }

        ctx.stroke();

        if (mouseOver && solution.isValid){
            tooltip.innerText = this.tooltip();
        }
    }

    isTouchingPoint(c){ //caution: returns infinity if point is closest to end points
        let a = viewPort.unitsToPixels(this.nodes[0].coords);
        let b = viewPort.unitsToPixels(this.nodes[1].coords);

        let ab = [b[0] - a[0], b[1]-a[1]]; //vectors ab, ac and bc
        let bc = [c[0] - b[0], c[1]-b[1]];
        let ac = [c[0] - a[0], c[1]-a[1]];

        let ab_bc = ab[0] * bc[0] + ab[1] * bc[1]; //dot products
        let ab_ac = ab[0] * ac[0] + ab[1] * ac[1];

        if (ab_bc >0){
            return false;
        }

        else if(ab_ac <0){
            return false;
        }

        else{
            let temp = Math.abs((ab[0] * ab[0] + ab[1] * ab[1]));
            return (Math.abs(ab[0] * ac[1] - ac[0] * ab[1]) / temp < 0.08);
        }

    }

    changeParent(newParent){
        let index = this.parentArray.indexOf(this);
        this.parentArray.splice(index,1);
        
        newParent.push(this);
        this.parentArray = newParent;
    }

    delete(){
        let index = this.parentArray.indexOf(this);
        this.parentArray.splice(index, 1);

        for (let i = 0; i < 2; ++i){
            index = this.nodes[i].beams.indexOf(this);
            this.nodes[i].beams.splice(index, 1);
        }
    }

    replaceConnection(replaced, replacement){
        if (this.nodes[0] == replaced){
            this.nodes[0] = replacement;
        }
        else{
            this.nodes[1] = replacement;
        }
        let index = replaced.beams.indexOf(this);
        replaced.beams.splice(index, 1);
        replacement.beams.push(this);
        return 0;
    }

    isIdentical(targetBeam){
        if (this.nodes[0] == targetBeam.nodes[0] && this.nodes[1] == targetBeam.nodes[1]){
            return true;
        }
        else if (this.nodes[0] == targetBeam.nodes[1] && this.nodes[1] == targetBeam.nodes[0]){
            return true;
        }
        return false;
    }

    getVector(node = this.nodes[0]){
        let mult = 1;
        let index = this.nodes.indexOf(node);
        if (index == -1){
            return NaN;
        }
        
        if (index == 1){
            mult = -1;
        }
        return [(this.nodes[1].coords[0] - this.nodes[0].coords[0])*mult,
        (this.nodes[1].coords[1] - this.nodes[0].coords[1])*mult];
    }

    getSin(node = this.nodes[0]){
        let vector = this.getVector(node);
        return vector [1]/Math.sqrt(vector[0]*vector[0]+vector[1]*vector[1]);
    }

    getCos(node = this.nodes[0]){
        let vector = this.getVector(node);
        return vector [0]/Math.sqrt(vector[0]*vector[0]+vector[1]*vector[1]);
    }
    
    tooltip(){
        return `Load: ${solution.getLoad(this.parentArray.indexOf(this)).toFixed(3)}`
    }
}

class Solution{
    constructor(nodeArray = nodes, beamArray = beams){
        this.isValid = false;
        let i,j,k;
        let beamMatrix = [];
        let forceMatrix = [];
        let toBePushed = 0;
        for (i = 0; i < nodeArray.length; ++i){    
            for (j = 0; j<2; ++j){
                beamMatrix.push([]);
                for (k = 0; k < beamArray.length; ++k){
                    if (j){
                        toBePushed = (beamArray[k].getSin(nodeArray[i]));
                    }
                    else{
                        toBePushed = (beamArray[k].getCos(nodeArray[i]));
                    }
                    if (isNaN(toBePushed)){
                        toBePushed = 0;
                    }
                    beamMatrix[2*i+j].push(toBePushed);
                }
                for (k = 0; k < nodeArray.length; ++k){
                    switch (nodeArray[k].support){
                        case 1:
                            beamMatrix[2*i+j].push((i==k)*(j==0));
                            break;
                        case 2:
                            beamMatrix[2*i+j].push((i==k)*(j==1));
                            break;
                        case 3:
                            beamMatrix[2*i+j].push((i==k)*(j==0));
                            beamMatrix[2*i+j].push((i==k)*(j==1));
                            break;
                    }
                }
                forceMatrix.push([nodeArray[i].force[j]])
            }
        }
        this.array = (math.multiply(math.inv(beamMatrix),forceMatrix));

        for (i = 0; i < this.array.length ;++i){
            this.array[i] = this.array[i][0];
        }

        this.maxLoad = math.max(this.array);
        this.minLoad = math.min(this.array);
        
        this.isValid = true;
    }

    getColor(beamIndex){
        let baseColour = hexToRGB(BEAM_COLOR);
        let addedColour;
        let mix;
        let result = [];
        let i = 0;
        if (this.array[beamIndex]>0){
            addedColour = hexToRGB(COMPRESSION_COLOR);
            mix = this.maxLoad;
        }
        else{
            addedColour = hexToRGB(TENSION_COLOR);
            mix = this.minLoad;
        }

        mix = this.array[beamIndex]/mix;
        for (i = 0; i<3; ++i){
            result.push(addedColour[i]*mix+baseColour[i]*(1-mix));
        }
        return RGBToHex(result);
    }

    getLoad(beamIndex){
        return -this.array[beamIndex]*solution.isValid;
    }
}

viewPort = {
    pan:[0, 0], //center of the viewPort in length units.
    zoom:100.0, //one length unit is zoom pixels

    unitsToPixels : function(coords){
        let newcoords = [0,0];
        newcoords[0] = coords[0] * this.zoom;
        newcoords[0] -= this.pan[0]// * this.zoom;
        newcoords[0] += canvas.width/2;

        newcoords[1] = coords[1] * this.zoom;
        newcoords[1] -= this.pan[1]// * this.zoom;
        newcoords[1] += canvas.height/2;

        return newcoords;
    },

   pixelsToUnits : function(coords){
        let newcoords = [0,0];
        newcoords[0] = coords[0] - canvas.width/2;
        newcoords[0] += this.pan[0];
        newcoords[0] /= this.zoom;

        newcoords[1] = coords[1] - canvas.height/2;
        newcoords[1] += this.pan[1];
        newcoords[1] /= this.zoom;

        return newcoords;
   },

   drawGrid : function(){
       let i, j;
       let gridStart = this.pixelsToUnits([0,0]);
       let gridEnd = this.pixelsToUnits([canvas.width, canvas.height]);
       gridStart = [Math.floor(gridStart[0]), Math.floor(gridStart[1])];
       gridEnd = [Math.ceil(gridEnd[0]), Math.ceil(gridEnd[1])];
       
       let lineStart = [0,0];

       for (i = gridStart[0], j = 0; i<gridEnd[0]; i+=0.2, ++j){
        ctx.beginPath();
        let lineStart = this.unitsToPixels([i, 0]);
        ctx.moveTo(lineStart[0] ,0);
        ctx.lineTo(lineStart[0], canvas.height);
        if (j % 5 ==0){
            ctx.lineWidth = 1;
        }
        else{
            ctx.lineWidth = 0.5;
        }
        ctx.strokeStyle = GRID_COLOR;
        ctx.stroke();
       }

       for (i = gridStart[1], j = 0; i<gridEnd[1]; i+=0.2, ++j){
        ctx.beginPath();
        let lineStart = this.unitsToPixels([0, i]);
        ctx.moveTo(0, lineStart[1]);
        ctx.lineTo(canvas.width, lineStart[1]);
        if (j % 5 ==0){
            ctx.lineWidth = 1;
        }
        else{
            ctx.lineWidth = 0.5;
        }
        ctx.strokeStyle = GRID_COLOR;
        ctx.stroke();
       } //TODO: merge those
   }
}

//FUNCTIONS

function hexToRGB(hexColour){
    let rgb = [0,0,0]
    if (hexColour.length == 7){
        hexColour = hexColour.slice(1,7);
    }
    rgb[0] = Number(`0x${hexColour.slice(0,2)}`);
    rgb[1] = Number(`0x${hexColour.slice(2,4)}`);
    rgb[2] = Number(`0x${hexColour.slice(4)}`);
    return rgb;
}

function RGBToHex(RGBArray){
    let rgb = "#";
    let temp = "";
    for (let i = 0; i < RGBArray.length; ++i){
        temp = parseInt(RGBArray[i]).toString(16);
        if (temp.length == 1){
            rgb += "0";
        }
        rgb += temp;
    }
    return rgb;
}

function getAtCoords(coords){
    length = this.length;
    for (let i = 0; i<this.length; i++){
        if (this[i].isTouchingPoint(coords)){
            return this[i];
        }
    }
    return false;
}

function getForcesAtCoords(coords){
    length = this.length;
    for (let i = 0; i<this.length; i++){
        if (this[i].fGizmoTouchingPoint(coords)){
            return this[i];
        }
    }
    return false;
}

function setPosition(coords){ //TODO: probably refactor this into node class
    length = this.length;
    for (let i = 0; i<this.length; i++){
        this[i].coords = coords;
    }
}
//INITIALIZATION

let nodes = [];
nodes.getAtCoords = getAtCoords;
nodes.getForcesAtCoords = getForcesAtCoords;

let beams = [];
beams.getAtCoords = getAtCoords;

let tempNodes = [];
tempNodes.setPosition = setPosition;
tempNodes.getAtCoords = getAtCoords;


let tempBeams = [];
tempBeams.getAtCoords = getAtCoords;

//MAIN LOOP

function mainLoop(){
    let i = 0;
    requestAnimationFrame(mainLoop);
    let mouseDelta = [0,0];

    mouseDelta = mouse.getDelta();

    if (scrolling){
        viewPort.pan[0] -= mouseDelta[0];
        viewPort.pan[1] -= mouseDelta[1];

    }

    if (movingNodes){
        tempNodes.setPosition(viewPort.pixelsToUnits(mouse.coords))
    }

    if (movingForce){
        movingForce.setForceFromGizmo(mouse.coords);
    }
    ctx.fillStyle = BG_COLOR
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    viewPort.drawGrid();

    for (i = 0; i < beams.length; ++i){
        beams[i].draw();
    }
    for (i = 0; i < nodes.length; ++i){ //TODO: draw function.
        nodes[i].draw();
    }
    for (i = 0; i < tempBeams.length; ++i){
        tempBeams[i].draw();
    }
    for (i = 0; i < tempNodes.length; ++i){
        tempNodes[i].draw();
    }
}

mainLoop();
