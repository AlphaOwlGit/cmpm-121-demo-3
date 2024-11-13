import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";

import "./style.css";
import "./leafletWorkaround.ts";

import { Board } from "./board.ts";

import luck from "./luck.ts";

interface Coin {
  i: number;
  j: number;
  serial: number;
}

const appName = "SlugPoints Scavenger Hunt";
document.title = appName;

const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;

const header = document.createElement("h1");
header.innerHTML = appName;
statusPanel.append(header);

const oakesHQ = leaflet.latLng(36.98949379578401, -122.06277128548504);
const zoomAmount = 19;
const tileDegrees = 1e-4;
const cellSteps = 8;
const spawnCacheChance = 0.1;

const playerCoin: Coin[] = [];
const coinText = document.createElement("p");
coinText.innerHTML = "Storage: <div id=coins></div>";
statusPanel.append(coinText);

const neighborhood = new Board(tileDegrees, cellSteps);

const map = leaflet.map(document.getElementById("map")!, {
  center: oakesHQ,
  zoom: zoomAmount,
  minZoom: zoomAmount,
  maxZoom: zoomAmount,
  scrollWheelZoom: false,
});

leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: zoomAmount,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const playerLocation = oakesHQ;
const marker = leaflet.marker(playerLocation);
marker.bindTooltip("You are here");
marker.addTo(map);

function spawnCache(i: number, j: number, bounds: leaflet.LatLngBounds) {
  const rect = leaflet.rectangle(bounds).addTo(map);

  const coinCount = Math.floor(luck([i, j, "iniValue"].toString()) * 100);
  const cacheCoin: Coin[] = [];

  for (let serial = 0; serial < coinCount; serial++) {
    cacheCoin.push({ i, j, serial });
  }

  rect.bindPopup(() => {
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
      <div>There is a cache here at "${i},${j}".</div>
      <button id="collect">Collect</button>
      <button id="deposit">Deposit</button>
      <div id=coins></div>`;

    counterUpdate(cacheCoin, popupDiv);

    popupDiv.querySelector<HTMLButtonElement>("#collect")!.addEventListener(
      "click",
      () => {
        collectCoin(cacheCoin);
        counterUpdate(cacheCoin, popupDiv);
      },
    );
    popupDiv.querySelector<HTMLButtonElement>("#deposit")!.addEventListener(
      "click",
      () => {
        depositCoin(cacheCoin);
        counterUpdate(cacheCoin, popupDiv);
      },
    );
    return popupDiv;
  });
}

function collectCoin(cacheCoin: Coin[]) {
  if (cacheCoin.length > 0) {
    const coin = cacheCoin.shift();
    playerCoin.push(coin!);
  }
}

function depositCoin(cacheCoin: Coin[]) {
  if (playerCoin.length > 0) {
    const coin = playerCoin.pop();
    cacheCoin.unshift(coin!);
  }
}

function counterUpdate(cacheCoin: Coin[], popupDiv: HTMLDivElement) {
  const availableCoins = popupDiv.querySelector<HTMLDivElement>("#coins")!;
  availableCoins.innerHTML = "";
  cacheCoin.slice(0, 5).forEach((coin) => {
    availableCoins.innerHTML += `${coin.i}:${coin.j}#${coin.serial}</br>`;
  });

  const inventoryCoins = statusPanel.querySelector<HTMLDivElement>("#coins")!;
  inventoryCoins.innerHTML = "";
  playerCoin.forEach((coin) => {
    inventoryCoins.innerHTML += `${coin.i}:${coin.j}#${coin.serial}</br>`;
  });
}

const cellCache = neighborhood.getCellsNearPoint(playerLocation);
for (const cell of cellCache) {
  if (luck([cell.i, cell.j].toString()) < spawnCacheChance) {
    spawnCache(cell.i, cell.j, neighborhood.getCellBounds(cell));
  }
}
