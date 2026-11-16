// DES7720 — EXERCICE 1 — Introduction à p5.js

// Charger les fichiers avant de commencer.
function preload() {
}


// Préparer le sketch une seule fois.
function setup() {
    createCanvas(640, 640); 
    background(255, 255, 0);

    rectMode(CENTER);
    rect(12, 12, 300, 300);
   
}

// Dessiner en boucle.
function draw() {
    background(255, mouseY * 10, 0, 10);


    // Rectangle follow the mouse
    rect(mouseX, mouseY, mouseX, 100);
}
