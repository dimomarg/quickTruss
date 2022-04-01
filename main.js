//Prep Canvas
const canvas = document.getElementById('mainCanvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext('2d');

class node{
    constructor(coords){
        this.coords = coords;
    }
    draw(){
        ctx.beginPath();
        ctx.arc(this.coords[0], this.coords[1], 20, 2*Math.PI)
        ctx.stroke();
    }
}

class beam{
    constructor(nodes){
        this.nodes = nodes;
    }
    draw(){
        ;
    }
}

viewPort = {
    pan:[0, 0], //center of the viewPort in length units.
    zoom:100.0 //one length unit is zoom pixels

}