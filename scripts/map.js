//var map = L.map('map').setView([30, 0], 3);
var map = L.map("map", {
  minZoom: 2,
  maxZoom: 10,
  maxBounds: [
    [-85, -Infinity],
    [85, Infinity],
  ],
  maxBoundsViscosity: 1.0,
  worldCopyJump: true,
}).setView([30, 0], 3);

L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    noWrap: false,
    minZoom: 2,
    maxZoom: 10,
    zoomControl: false,
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
  },
).addTo(map);

var redIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

var blackIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const artifactPositionCounts = {};

function getAdjustedCoordinates(latitude, longitude) {
  const key = `${latitude},${longitude}`;
  const count = artifactPositionCounts[key] || 0;
  artifactPositionCounts[key] = count + 1;

  if (count === 0) {
    return { latitude, longitude };
  }

  const offset = 0.00075 * count;
  return {
    latitude: latitude + offset,
    longitude: longitude + offset,
  };
}

function getDisplayCoordinates(item) {
  if (item._displayCoordinates) {
    return item._displayCoordinates;
  }

  if (item.hasOwnProperty("artifacts")) {
    return item.coordinates;
  }

  item._displayCoordinates = getAdjustedCoordinates(
    item.coordinates.latitude,
    item.coordinates.longitude,
  );
  return item._displayCoordinates;
}

function buildImageGallery(item, borderColor) {
  const images = item.images || [item.image];
  const galleryId = item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const imageControls =
    images.length > 1
      ? `<div class="image-controls">${images
          .map(
            (image, index) =>
              `<label class="image-control" for="${galleryId}-${index}">Image ${index + 1}</label>`,
          )
          .join("")}</div>`
      : "";

  return `<div class="image-gallery">
        ${images
          .map(
            (image, index) =>
              `<input
                class="image-toggle image-toggle-${index}"
                type="radio"
                id="${galleryId}-${index}"
                name="${galleryId}"
                ${index === 0 ? "checked" : ""}
            >`,
          )
          .join("")}
        <div class="image-slides">
            ${images
              .map(
                (image, index) =>
                  `<img class="image gallery-image gallery-image-${index}" src="${image.link}" alt="${item.name}" style="border: 2px solid ${borderColor}">`,
              )
              .join("")}
        </div>
        ${imageControls}
    </div>`;
}

export function createMarkerAndPopup(item, museum) {
  let iconColor;
  let borderColor;
  let licenseLink;
  let attributionLink;
  const primaryImage = item.images ? item.images[0] : item.image;
  museum = Object.assign({}, museum);

  if (item.hasOwnProperty("artifacts")) {
    iconColor = blackIcon;
    borderColor = "#3D3D3D";
    museum.name = "Museum";
  } else {
    iconColor = redIcon;
    borderColor = "#CB2B3E";
  }

  if (primaryImage.license.slice(0, 2) === "CC") {
    licenseLink = `https://creativecommons.org/licenses/${primaryImage.license.split(" ")[1].toLowerCase()}/${primaryImage.license.split(" ")[2]}`;
  } else if (primaryImage.license === "Public Domain") {
    licenseLink = `https://creativecommons.org/share-your-work/public-domain/`;
  } else {
    licenseLink = `https://en.wikipedia.org/wiki/${primaryImage.license}`;
  }

  if (primaryImage.attribution.hasOwnProperty("link")) {
    attributionLink = `<a href="${primaryImage.attribution.link}">${primaryImage.attribution.name}</a>`;
  } else {
    attributionLink = `${primaryImage.attribution.name}`;
  }

  const displayCoordinates = getDisplayCoordinates(item);
  L.marker([displayCoordinates.latitude, displayCoordinates.longitude], {
    icon: iconColor,
    alt: item.name,
    title: item.name,
  })
    .addEventListener("click", () => {
      if (item.hasOwnProperty("artifacts")) {
        item.artifacts.forEach((artifact) => {
          if (artifact._created) {
            return;
          }
          const artifactCoordinates = getAdjustedCoordinates(
            artifact.coordinates.latitude,
            artifact.coordinates.longitude,
          );
          artifact._displayCoordinates = artifactCoordinates;
          artifact._created = true;
          createMarkerAndPopup(artifact, item);
          new L.Geodesic(
            [
              {
                lat: item.coordinates.latitude,
                lng: item.coordinates.longitude,
              },
              {
                lat: artifact.coordinates.latitude,
                lng: artifact.coordinates.longitude,
              },
            ],
            { color: "#CB2B3E", opacity: 0.5, steps: 4, weight: 4 },
          ).addTo(map);
        });
      }
    })
    .bindPopup(
      `<h2>${item.name}</h2>
            <div class="museum">${museum.name}</div>
            <figure>
                ${buildImageGallery(item, borderColor)}
                <figcaption>By ${attributionLink}, licensed under <a href="${licenseLink}">${primaryImage.license}</a></figcaption>
            </figure>
            <p>${item.description.general}</p>
            <p>${item.description.dispute}<br> — <a href="${item.description.source}">Source</a></p>`,
    )
    .addTo(map);
}
