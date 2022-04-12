//CANVAS SETUP

const canvas = document.getElementById('mainCanvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext('2d');

let scrolling = false;
let movingNodes = false;
let movingForce = false;
// EVENTS AND LISTENERS

canvas.addEventListener('mousemove', function(event){
    mouse.update(event);
})

canvas.addEventListener('wheel', function(event){
    event.preventDefault();
    viewPort.zoom += event.deltaY/10;
})

canvas.addEventListener('keydown', function(event){
    let pressedNode = nodes.getAtCoords(mouse.coords);
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
            else if (pressedNode = beams.getAtCoords(mouse.coords)){
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


        default:
            console.log(event.code);
        
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
})


canvas.onmousedown = function(){ //TODO: package node creation as its own function.
    newNode = new node(viewPort.pixelsToUnits(mouse.coords), tempNodes);
    tempNodes.push(newNode);
    extrudeFrom = nodes.getAtCoords(mouse.coords);

    if (extrudeFrom){
        tempBeams.push(new beam([newNode, extrudeFrom], tempBeams));
    }
    else if (extrudeFrom = beams.getAtCoords(mouse.coords)){
        tempBeams.push(new beam([newNode, extrudeFrom.nodes[0]],tempBeams));
        tempBeams.push(new beam([newNode, extrudeFrom.nodes[1]],tempBeams));
    }
    movingNodes = true;
}

canvas.onmouseup = function(){
    let mergeNode;
    movingNodes = false;
    while (tempNodes.length > 0){
        if (mergeNode = nodes.getAtCoords(mouse.coords)){
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
}

//CLASSES

mouse = { //mouse handler object
    coords : [0,0],
    prevCoords : [0,0],
    hasMoved : false,

    update : function(event){
        this.prevCoords = [this.coords[0], this.coords[1]];
        this.coords = [event.x, event.y];
        this.hasMoved = true;
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
    constructor(coords, parentArray = undefined){
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
        if (this.isTouchingPoint(mouse.coords)){
            ctx.fillStyle = "#0000ff";
        }
        else{
            ctx.fillStyle = "#000000";
        }
        ctx.fill();

        if (this.force[0] != 0 || this.force[1] != 0){
            let gizmoCoords = this.getForceGizmo();
            ctx.beginPath();
            ctx.moveTo(drawCoords[0], drawCoords[1]);
            ctx.lineTo(gizmoCoords[0], gizmoCoords[1]);
            ctx.lineWidth = 3;
            ctx.strokeStyle = "#FF0000"
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
}

class beam{
    constructor(nodes, parentArray = undefined){
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

        if (this.isTouchingPoint(mouse.coords)){
            ctx.strokeStyle = "#FF0000"
        }
            else{
                ctx.strokeStyle = "#000000"
            }

        ctx.stroke();
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
   }
}

//FUNCTIONS

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

//SOLVER FUNCTIONS
function solve(nodeArray = nodes, beamArray = beams){
    let i,j,k;
    let forceMatrix = [];
    let supports
    console.log(forceMatrix);
    for (i = 0; i < nodeArray.length; ++i){    
        for (j = 0; j<2; ++j){
            forceMatrix.push([]);
            for (k = 0; k < beamArray.length; ++k){
                forceMatrix[2*i+j].push(nodeArray[i].beams.indexOf(beamArray[k]));
            }
            for (k = 0; k < nodeArray.length; ++k){
                switch (nodeArray[k].support){
                    case 1:
                        forceMatrix[2*i+j].push((i==k)*(j==0));
                        break;
                    case 2:
                        forceMatrix[2*i+j].push((i==k)*(j==1));
                        break;
                    case 3:
                        forceMatrix[2*i+j].push((i==k)*(j==0));
                        forceMatrix[2*i+j].push((i==k)*(j==1));
                        break;
                }
            }
        }
    }
    return forceMatrix;
}

//INITIALIZATION

let nodes = [];
nodes.getAtCoords = getAtCoords;
nodes.getForcesAtCoords = getForcesAtCoords;

let beams = [];
beams.getAtCoords = getAtCoords;

let tempNodes = [];
tempNodes.setPosition = setPosition;

let tempBeams = [];


//MAIN LOOP

function mainLoop(){
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

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (i = 0; i < beams.length; ++i){
        beams[i].draw();
    }
    for (let i = 0; i < nodes.length; ++i){ //TODO: draw function.
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
