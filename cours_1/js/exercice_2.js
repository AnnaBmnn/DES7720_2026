// Déclaration de variables
let refletImage;
let motorImage;
let capture;
let prevMouseX = 0;
let prevMouseY = 0;
let nbrSamePlace = 0;

function drawCameraPart() {
    image(capture, 0, height, width, height);
    copy(capture, 0, 0, capture.width, capture.height, mouseX , mouseY , capture.width / 10, capture.height / 10);
}

function bounceImage(){
    // On augment la vitesse par rapport à la durée de pause
    let vitesse = nbrSamePlace * 0.005;
    // Les dimesnions de l'image dessinée
    let imageWidth = capture.width / 10;
    let imageHeight = capture.height / 10;

    // Les limites dans lesquels on veut essiner l'image, comme 
    // on dessine l'image à partir du coin haut gauche, 
    // la limite doit prednre tout l'écran moins la hauteur et l'argeur
    let limiteX = width - imageWidth;
    let limiteY = height - imageHeight;

    // On calcule la  quantité de mouvement. Pour cela on part du point 
    // de départ et on calcule la distance = temps * vitesse
    // on utilise en modulo la limite fois 2, pour pouvoir ensuite déterminer le sens du mouvement
    let mouvementX = (mouseX + nbrSamePlace * vitesse) % (limiteX * 2);
    let mouvementY = (mouseY + nbrSamePlace * vitesse) % (limiteY * 2);

    // si le mouvement est plus petit que la limite : il descend donc on peut juste utiliser la quantité de mouvement
    // sinon il monte et donc on inverse la progression
    let positionX = mouvementX < limiteX
    ? mouvementX
    : limiteX * 2 - mouvementX;

    let positionY = mouvementY < limiteY
    ? mouvementY
    : limiteY * 2 - mouvementY;

    copy(capture, 0, 0, capture.width, capture.height, positionX ,positionY , imageWidth, imageHeight);
}

function preload() {   
    refletImage = loadImage('./assets/images/reflet.jpg');
    motorImage = loadImage('./assets/images/motor.png');
}


function setup() {
    createCanvas(windowWidth, windowHeight);

    // Accéder à la webcam et créer la capture vidéo 
    capture = createCapture(VIDEO);

    capture.size(640, 640);

    capture.hide();

}

function draw() {
    background(0, 0, 0, 5);

    // drawCameraPart()

    if(prevMouseX == mouseX && prevMouseY == mouseY){
        nbrSamePlace += 1;
        image(capture, 0, height, width, height);
        bounceImage();
    }else {
        nbrSamePlace = 0;
        drawCameraPart()
    }

    prevMouseX = mouseX
    prevMouseY = mouseY
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
