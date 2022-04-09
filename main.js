//CANVAS SETUP

const canvas = document.getElementById('mainCanvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext('2d');

let scrolling = false;
let movingNodes = false;

// EVENTS AND LISTENERS

canvas.addEventListener('mousemove', function(event){
    mouse.update(event);
})

canvas.addEventListener('wheel', function(event){
    console.log(event);
    event.preventDefault();
    console.log(event.deltaY);
    viewPort.zoom += event.deltaY/10;
})

canvas.addEventListener('keydown', function(event){
    if (event.code[0] == "K"){ //if key pressed has code beginning with K,therefore Key
        event.preventDefault();
    }
    switch (event.code){
        case "Space":
            scrolling = true;
            break;
        case "KeyD":
            let toBeDeleted;

            if (toBeDeleted = nodes.getAtCoords(mouse.coords)){
                toBeDeleted.deleteFrom(nodes);
            }
            else if (toBeDeleted = beams.getAtCoords(mouse.coords)){
                toBeDeleted.deleteFrom(beams);
            }
            break;
        default:
            console.log(event.code);
    }
})

canvas.addEventListener('keyup', function(event){
    switch (event.code){
        case "Space":
            console.log("spacebar");
            scrolling = false;
            break;
        default:
            console.log(event.code);
    }
})


canvas.onmousedown = function(){ //TODO: package node creation as its own function.
    newNode = new node(viewPort.pixelsToUnits(mouse.coords));
    tempNodes.push(newNode);
    extrudeFrom = nodes.getAtCoords(mouse.coords);

    if (extrudeFrom){
        tempBeams.push(new beam([newNode, extrudeFrom]));
    }
    else if (extrudeFrom = beams.getAtCoords(mouse.coords)){
        tempBeams.push(new beam([newNode, extrudeFrom.nodes[0]]));
        tempBeams.push(new beam([newNode, extrudeFrom.nodes[1]]));
    }
    beams.getAtCoords(mouse.coords);
    movingNodes = true;
}

canvas.onmouseup = function(){
    movingNodes = false;
    let length = tempNodes.length;
    while (tempNodes.length > 0){
        nodes.push(tempNodes.pop())
    }
    while (tempBeams.length > 0){
        beams.push(tempBeams.pop())
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
    constructor(coords){
        this.coords = coords;
    }

    beams = [];

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
    }

    isTouchingPoint(coords){
        let distanceVector = viewPort.unitsToPixels(this.coords);
        distanceVector = [distanceVector[0] - coords[0], distanceVector[1]- coords[1]]
        let distanceSquared = distanceVector[0]*distanceVector[0]
                            + distanceVector[1]*distanceVector[1];
        return distanceSquared < 100;
    }

    deleteFrom(nodeArray = nodes, beamArray = beams){
        let index = nodeArray.indexOf(this);
        nodeArray.splice(index, 1);

        while(this.beams.length!=0){
            this.beams[0].deleteFrom(beamArray);
        }
    }

    transferBeamsTo(target){
        while (this.beams.length>0){
            this.beams[0].replaceConnection(this, target)
        }
    }
}

class beam{
    constructor(nodes){
        this.nodes = nodes;
        nodes[0].beams.push(this);
        nodes[1].beams.push(this);
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

    deleteFrom(beamArray = beams){
        let index = beamArray.indexOf(this);
        beamArray.splice(index, 1);

        for (let i = 0; i < 2; ++i){
            index = this.nodes[i].beams.indexOf(this);
            this.nodes[i].beams.splice(index, 1);
        }
    }

    replaceConnection(replaced, replacement){
        if (this.nodes[0] == replaced && replacement != this.nodes[1]){
            this.nodes[0] = replacement;
        }
        else if (this.nodes[1] == replaced && replacement != this.nodes[0]){
            this.nodes[1] = replacement;
        }
        let index = replaced.beams.indexOf(this);
        replaced.beams.splice(index, 1);
        replacement.beams.push(this);
        return 0;
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
            console.log("yes");
            return this[i];
        }
    }
    return false;
}

function setPosition(coords){
    length = this.length;
    for (let i = 0; i<this.length; i++){
        this[i].coords = coords;
    }
}

//INITIALIZATION

let nodes = [new node([0,0]), new node([1,1])];
nodes.getAtCoords = getAtCoords;

let beams = [new beam([nodes[0], nodes[1]])];
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
