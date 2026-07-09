import { createMarkerAndPopup } from "./map.js";

fetch('./museums.json')
    .then(response => response.json())
    .then(museums => {
        for (let museum of museums) {
            createMarkerAndPopup(museum);
        }
    });
