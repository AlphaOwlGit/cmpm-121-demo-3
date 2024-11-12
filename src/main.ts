import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";

import "./style.css";
import "./leafletWorkaround.ts";

import luck from "./luck.ts";

const oakesHQ = leaflet.latLng(36.98949379578401, -122.06277128548504);
const zoomAmount = 19;
const tileDegrees = 0.0001;
const cellSteps = 8;
const spawnCacheChance = 0.15;

const map = leaflet.map(document.getElementById("map")!, {
  center: oakesHQ,
  zoom: zoomAmount,
  minZoom: zoomAmount,
  maxZoom: zoomAmount,
});

leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const playerLocation = leaflet.marker(oakesHQ);
playerLocation.bindTooltip("You are here");
playerLocation.addTo(map);

let playerPoints = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "0 points accumulated";

function spawnCache(i: number, j: number) {
  const origin = oakesHQ;
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * tileDegrees, origin.lng + j * tileDegrees],
    [origin.lat + (i + 1) * tileDegrees, origin.lng + (j + 1) * tileDegrees],
  ]);

  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  rect.bindPopup(() => {
    let pointValue = Math.floor(luck([i, j, "initialValue"].toString()) * 100);

    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
                <div>There is a cache here at "${i},${j}". It has value <span id="value">${pointValue}</span>.</div>
                <button id="poke">Collect</button><button id="dropoff">Deposit</button>`;

    popupDiv.querySelector<HTMLButtonElement>("#poke")!.addEventListener(
      "click",
      () => {
        if (pointValue > 0) {
          pointValue--;
          popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            pointValue.toString();
          playerPoints++;
          statusPanel.innerHTML = `${playerPoints} points accumulated`;
        }
      },
    );

    popupDiv.querySelector<HTMLButtonElement>("#dropoff")!.addEventListener(
      "click",
      () => {
        if (playerPoints > 0) {
          pointValue++;
          popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            pointValue.toString();
          playerPoints--;
          statusPanel.innerHTML = `${playerPoints} points accumulated`;
        }
      },
    );
    return popupDiv;
  });
}

for (let i = -cellSteps; i < cellSteps; i++) {
  for (let j = -cellSteps; j < cellSteps; j++) {
    if (luck([i, j].toString()) < spawnCacheChance) {
      spawnCache(i, j);
    }
  }
}
