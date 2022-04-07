//CANVAS SETUP

const canvas = document.getElementById('mainCanvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext('2d');

var scrolling = false;

mouse = { //mouse handler class
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

canvas.addEventListener('mousemove', function(event){
    mouse.update(event);
})

canvas.addEventListener('wheel', function(event){
    console.log(event);
    event.preventDefault();
    console.log(event.deltaY);
    viewPort.zoom += event.deltaY/10;
})

class node{
    constructor(coords){
        this.coords = coords;
    }

    x(){
        return this.coords[0];
    }
    y(){
        return this.coords[1];
    }

    draw(){
        let drawCoords = viewPort.transform(this.coords);
        ctx.beginPath();
        ctx.arc(drawCoords[0], drawCoords[1], 10, 0, 2*Math.PI);
        ctx.fill();
    }
}

class beam{
    constructor(nodes){
        this.nodes = nodes;
    }
    draw(){
        let startCoords = viewPort.transform(this.nodes[0].coords);
        let endCoords = viewPort.transform(this.nodes[1].coords);
        ctx.beginPath();
        ctx.moveTo(startCoords[0], startCoords[1]);
        ctx.lineTo(endCoords[0], endCoords[1]);
        ctx.lineWidth = 5;
        ctx.stroke();
    }
}

viewPort = {
    pan:[0, 0], //center of the viewPort in length units.
    zoom:100.0, //one length unit is zoom pixels
    
    transform : function(coords){
        let newcoords = [0,0];
        newcoords[0] = coords[0] * this.zoom;
        newcoords[0] -= this.pan[0]// * this.zoom;
        newcoords[0] += canvas.width/2;
        
        newcoords[1] = coords[1] * this.zoom;
        newcoords[1] -= this.pan[1]// * this.zoom;
        newcoords[1] += canvas.height/2;

        return newcoords;
    },
    
   reverseTransform : function(coords){
       let newcoords = [0,0];
       newcoords[0] = coords[0] - canvas.width/2;
       newcoords[0] += this.pan[0];
       newcoords[0] /= this.zoom;
       
       newcoords[1] = coords[1] - canvas.height/2;
       newcoords[1] += this.pan[1];
       newcoords[1] /= this.zoom;
   }
}

//TEST CODE

let nodes = [new node([0,0]), new node([1,1])];
let beams = [new beam([nodes[0], nodes[1]])];

for (let i = 0; i < nodes.length; ++i){
    nodes[i].draw();
}

for (let i = 0; i < beams.length; ++i){
    beams[i].draw();
}

function mainLoop(){
    requestAnimationFrame(mainLoop);
    let mouseDelta = [0,0];

    if (scrolling){
        mouseDelta = mouse.getDelta();
        viewPort.pan[0] -= mouseDelta[0];
        viewPort.pan[1] -= mouseDelta[1];
        
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
        
    for (let i = 0; i < nodes.length; ++i){ //TODO: draw function.
        nodes[i].draw();
    }
    for (let i = 0; i < beams.length; ++i){
        beams[i].draw();
    }
}

mainLoop();

// EVENTS
canvas.onmousedown = function(){
    scrolling = true;
}

canvas.onmouseup = function(){
    scrolling = false;
}
