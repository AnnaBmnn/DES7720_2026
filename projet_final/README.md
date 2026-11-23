# Custom Three.js Domemaster par Ju 

Une petite base Three.js pour créer une scène et la voir dans un dôme. Le dé est là pour essayer. Pour changer de scène, modifie le chemin dans `sceneMaster.js`. Le dé est dans `scenes/diceScene.js`. Le reste se trouve dans `core/`.

## Installation

Node.js

## Démarrer 

Option 1

double-clique sur **Lancer.command** pour démarrer le server + browser viewer

Garde la fenêtre Terminal ouverte

Option 2 

VS CODE - Terminal - node core/server.js

Viewer : http://localhost:8080

Dome.html = main

Three.js link par CDN donc nécessite internet!

## Regarder la scène

**View** permet de choisir la vue 3D, le rendu circulaire **Dome**, ou le petit dôme en 3D **Dome preview**. **Inside** te place à l'intérieur et **Outside** te ramène à l'extérieur.

Glisse pour tourner, défile pour zoomer et glisse avec le bouton droit pour te déplacer. **Pause** arrête l'animation et **Reset** la recommence. Appuie sur **M** pour cacher ou afficher le menu.

**Preview** règle la qualité de l'aperçu seulement

## RENDER

Choisis ta caméra dans **Render camera** et la taille dans **Size**, jusqu'à 8K si ton ordinateur le permet. Le dôme est carré; les autres vues gardent les proportions de la fenêtre.

Coche **Transparent** pour garder un fond transparent. Sinon, le fond est gris foncé.

**PNG folder…** et **Sequence folder…** ouvrent le Finder pour choisir les dossiers. Ces choix restent actifs jusqu'au redémarrage du serveur. Par défaut, les fichiers vont dans `renders/`.

**Render PNG** enregistre une image. **Render sequence** enregistre le nombre d'images dans **Frames**, à partir du début. **FPS** règle le rythme : 150 images à 30 FPS donnent 5 secondes. **Cancel** arrête après l'image en cours.

Le chemin s'affiche une fois le rendu terminé.

Le **FOV** est à 210° par défaut. Mets-le à 180° pour une demi-sphère.
