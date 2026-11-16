// Déclaration de variables
let refletImage;
let motorImage;
let capture;
let prevMouseX = 0;
let prevMouseY = 0;

function drawCameraPart() {
    image(capture, 0, height, width, height);
    copy(capture, 0, 0, capture.width, capture.height, mouseX , mouseY , capture.width / 10, capture.height / 10);
}

function preload() {   
    refletImage = loadImage('./assets/images/reflet.jpg');
    motorImage = loadImage('./assets/images/motor.png');
}


function setup() {
    createCanvas(windowWidth, windowHeight);
    background(0);

    // Accéder à la webcam et créer la capture vidéo 
    capture = createCapture(VIDEO);

    capture.size(640, 640);

    capture.hide();

}

function draw() {
    // On doit dessiner l'image pour pouvoir la copier 
    // On la dessine au bas du canvas pour pouvoir la cacher
    // background(0, 0, 0, 10)

}

function mouseDragged() {
    drawCameraPart()
}

function mousePressed() {
    drawCameraPart()
}


/*
Pistes d’exploration — choisissez une idée ou suivez la vôtre.

- Changez la photo pour dessiner avec une image de votre choix.
- Changez la taille du fragment que vous prélevez dans la photo. Essayez un carré de 20 × 20 pixels, puis de 100 × 100 pixels.
- Dessinez avec un GIF animé pour prélever des fragments à différents moments.
- Remplacez la photo par une vidéo et dessinez avec des fragments de cette vidéo.
- Dessinez avec des formes au clic ou au glisser.
- Ajoutez deux états au sketch : un double-clic (doubleClicked()) pourrait faire passer de la photo aux formes.
*/
