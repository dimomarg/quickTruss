//Prep Canvas
const canvas = document.getElementById('mainCanvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext('2d');

var scrolling = false;

var mouse = [undefined, undefined];

window.addEventListener('mousemove', function(event){
    mouse = [event.x, event.y]
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
        ctx.arc(drawCoords[0], drawCoords[1], 20, 0, 2*Math.PI);
        ctx.stroke();
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
        ctx.stroke();
    }
}

viewPort = {
    pan:[0, 0], //center of the viewPort in length units.
    zoom:100.0, //one length unit is zoom pixels
    
    transform : function(coords){
        let newcoords = [0,0];
        newcoords[0] = coords[0] * this.zoom;
        newcoords[0] -= this.pan[0] * this.zoom;
        newcoords[0] += canvas.width/2;
        
        newcoords[1] = coords[1] * this.zoom;
        newcoords[1] -= this.pan[1]*this.zoom;
        newcoords[1] += canvas.height/2;

        return newcoords;
    }
}


let nodes = [new node([0,0]), new node([1,1])];
let beams = [new beam([nodes[0], nodes[1]])];
for (let i = 0; i < nodes.length; ++i){
    nodes[i].draw();
}
for (let i = 0; i < beams.length; ++i){
    beams[i].draw();
}

// EVENTS
canvas.onmousedown = function(event){
    scrolling = true;
}

canvas.onmouseup = function(event){
    scrolling = false;
    console.log(mouse);
}

function loop(){
    requestAnimationFrame(loop);
    console.log("looping");
}

loop();