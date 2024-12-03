import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";

import "./style.css";
import "./leafletWorkaround.ts";

import { Board } from "./board.ts";
import {
  setupMovementButtons,
  setupResetButton,
  updateInventory,
} from "./ui.ts";

import luck from "./luck.ts";

export interface Coin {
  i: number;
  j: number;
  serial: number;
}

interface Momento<T> {
  toMomento(): T;
  fromMomento(momento: T): void;
}

interface Geocache {
  i: number;
  j: number;
  momento: Momento<string>;
  coins: Coin[];
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

const map = leaflet.map(document.getElementById("map")!, {
  center: oakesHQ,
  zoom: zoomAmount,
  minZoom: zoomAmount - 4,
  maxZoom: zoomAmount,
  scrollWheelZoom: false,
});

let autoLocate = false;
let watchID: number;
const pathHistory: leaflet.LatLng[] = [];
const polyLine = leaflet.polyline(pathHistory).addTo(map);

let playerLocation = oakesHQ;
const marker = leaflet.marker(playerLocation);
marker.bindTooltip("You are here");
marker.addTo(map);

const playerCoin: Coin[] = [];
const coinText = document.createElement("p");
coinText.innerHTML = "Storage: <div id=coins></div>";
statusPanel.append(coinText);

const updatePlayerLocation = (newLat: number, newLng: number) => {
  setPlayerLocation(newLat, newLng);
  updateMapView();
  updatePolyline();
  persistGameState();
};

function setPlayerLocation(lat: number, lng: number) {
  playerLocation = leaflet.latLng(lat, lng);
}

function persistGameState() {
  saveState();
}

function updateMapView() {
  marker.setLatLng(playerLocation);
  map.panTo(playerLocation);
  clearExistingCaches();
  cacheRegenerate();
}

function updatePolyline() {
  pathHistory.push(playerLocation);
  polyLine.setLatLngs(pathHistory);
}

function clearPolyline() {
  pathHistory.splice(0, pathHistory.length, playerLocation);
  polyLine.setLatLngs(pathHistory);
}

const clearExistingCaches = () => {
  map.eachLayer((layer: leaflet.Rectangle) => {
    if (layer instanceof leaflet.Rectangle) {
      map.removeLayer(layer);
    }
  });
};

// Movement buttons setup
setupMovementButtons(statusPanel, {
  up: () => {
    updatePlayerLocation(playerLocation.lat + tileDegrees, playerLocation.lng),
      console.log("Up button clicked");
  },
  down: () =>
    updatePlayerLocation(playerLocation.lat - tileDegrees, playerLocation.lng),
  left: () =>
    updatePlayerLocation(playerLocation.lat, playerLocation.lng - tileDegrees),
  right: () =>
    updatePlayerLocation(playerLocation.lat, playerLocation.lng + tileDegrees),
});

function findPos(pos: GeolocationPosition) {
  updatePlayerLocation(pos.coords.latitude, pos.coords.longitude);
  watchID = navigator.geolocation.watchPosition((pos) => {
    updatePlayerLocation(pos.coords.latitude, pos.coords.longitude);
  });
}

const geoPosition = document.createElement("button");
geoPosition.innerHTML = "🌐";
geoPosition.addEventListener("click", () => {
  if (!autoLocate) {
    autoLocate = true;
    navigator.geolocation.getCurrentPosition(findPos);
  } else {
    autoLocate = false;
    navigator.geolocation.clearWatch(watchID);
  }
});
statusPanel.append(geoPosition);

setupResetButton(statusPanel, () => {
  updatePlayerLocation(oakesHQ.lat, oakesHQ.lng);
  localStorage.clear();
  momentos.clear();
  clearPolyline();
  playerCoin.splice(0, playerCoin.length);
  clearExistingCaches();
  inventoryUpdate();
  cacheRegenerate();
});

inventoryUpdate();
function inventoryUpdate() {
  updateInventory(statusPanel, playerCoin, (coin: Coin) => {
    centerOnCache(coin.i, coin.j);
  });
}

const neighborhood = new Board(tileDegrees, cellSteps);

leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: zoomAmount,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const momentos = new Map<string, string>();
const cacheCoins: leaflet.Rectangle[] = [];

function createGeocache(i: number, j: number): Geocache {
  const coinCount = Math.floor(luck([i, j, "iniValue"].toString()) * 100);
  const cacheCoin: Coin[] = [];

  for (let serial = 0; serial < coinCount; serial++) {
    cacheCoin.push({ i, j, serial });
  }
  return {
    i,
    j,
    momento: {
      toMomento() {
        return JSON.stringify(cacheCoin);
      },
      fromMomento(momento: string) {
        cacheCoin.splice(0, cacheCoin.length);
        for (const coin of JSON.parse(momento)) {
          cacheCoin.push(coin);
        }
      },
    },
    coins: cacheCoin,
  };
}

function spawnCache(i: number, j: number, bounds: leaflet.LatLngBounds) {
  const rect = leaflet.rectangle(bounds).addTo(map);

  const cache = createGeocache(i, j);
  const cacheCoord = [i, j].toString();
  if (momentos.has(cacheCoord)) {
    cache.momento.fromMomento(momentos.get(cacheCoord)!);
  }

  rect.bindPopup(() => {
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
      <div>There is a cache here at "${i},${j}".</div>
      <div id=value>There are <span id="value">${cache.coins.length} </span>coins.</div>
      <button id="collect">Collect</button>
      <button id="deposit">Deposit</button>
      <div id=coins></div>`;

    cacheUpdate(cache, popupDiv);

    popupDiv.querySelector<HTMLButtonElement>("#collect")!.addEventListener(
      "click",
      () => {
        collectCoin(cache);
        cacheUpdate(cache, popupDiv);
      },
    );
    popupDiv.querySelector<HTMLButtonElement>("#deposit")!.addEventListener(
      "click",
      () => {
        depositCoin(cache);
        cacheUpdate(cache, popupDiv);
      },
    );
    return popupDiv;
  });
}

function collectCoin(cache: Geocache) {
  if (cache.coins.length > 0) {
    const coin = cache.coins.shift();
    playerCoin.push(coin!);
  }
}

function depositCoin(cache: Geocache) {
  if (playerCoin.length > 0) {
    const coin = playerCoin.pop();
    cache.coins.unshift(coin!);
  }
}

function cacheUpdate(cache: Geocache, popupDiv: HTMLDivElement) {
  const cacheCoord = [cache.i, cache.j].toString();
  momentos.set(cacheCoord, cache.momento.toMomento());
  saveState();
  inventoryUpdate();

  const textUpdate = popupDiv.querySelector<HTMLDivElement>("#value")!;
  textUpdate.innerHTML = `
    <div id=value>There are <span id="value">${cache.coins.length} </span>coins.</div>`;

  const availableCoins = popupDiv.querySelector<HTMLDivElement>("#coins")!;
  availableCoins.innerHTML = "";
  cache.coins.slice(0, 3).forEach((coin) => {
    availableCoins.innerHTML += `${coin.i}:${coin.j}#${coin.serial}</br>`;
  });
}

function centerOnCache(i: number, j: number) {
  const cacheLat = i * tileDegrees;
  const cacheLng = j * tileDegrees;

  map.setView(leaflet.latLng(cacheLat, cacheLng), zoomAmount);
}

function cacheSpawn() {
  const cellCache = neighborhood.getCellsNearPoint(playerLocation);
  for (const cell of cellCache) {
    if (luck([cell.i, cell.j].toString()) < spawnCacheChance) {
      spawnCache(cell.i, cell.j, neighborhood.getCellBounds(cell));
    }
  }
}

function cacheRegenerate() {
  for (let i = 0; i < cacheCoins.length; i++) {
    const coin = cacheCoins[i];
    coin.remove();
  }
  cacheCoins.splice(0, cacheCoins.length);
  cacheSpawn();
}

if (!localStorage.getItem("cache")) {
  saveState();
  cacheSpawn();
} else {
  loadState();
}

function saveState() {
  const momentoArray = Array.from(momentos.entries());
  localStorage.setItem("cache", JSON.stringify(momentoArray));
  localStorage.setItem("playerCoins", JSON.stringify(playerCoin));
  localStorage.setItem(
    "playerLocation",
    JSON.stringify({
      i: playerLocation.lat,
      j: playerLocation.lng,
    }),
  );
  localStorage.setItem("pathHistory", JSON.stringify(pathHistory));
}

function loadState() {
  const momentoArray = JSON.parse(localStorage.getItem("cache")!);
  momentoArray.forEach((cache: string) => {
    momentos.set(cache[0], cache[1]);
  });

  const storedCoins = JSON.parse(localStorage.getItem("playerCoins")!);
  storedCoins.forEach((coin: Coin) => {
    playerCoin.push(coin);
  });

  const { i, j } = JSON.parse(localStorage.getItem("playerLocation")!);
  setPlayerLocation(i, j);
  updateMapView();

  const storedPath = JSON.parse(localStorage.getItem("pathHistory")!);
  pathHistory.splice(0, 0, ...pathHistory);
  polyLine.setLatLngs(storedPath);

  inventoryUpdate();
}
