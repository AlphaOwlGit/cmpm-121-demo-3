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
  minZoom: zoomAmount,
  maxZoom: zoomAmount,
  scrollWheelZoom: false,
});

let playerLocation = oakesHQ;
const marker = leaflet.marker(playerLocation);
marker.bindTooltip("You are here");
marker.addTo(map);

const updatePlayerLocation = (newLat: number, newLng: number) => {
  playerLocation = leaflet.latLng(newLat, newLng);
  marker.setLatLng(playerLocation);
  map.panTo(playerLocation);

  clearExistingCaches();

  cacheRegenerate();
};

const clearExistingCaches = () => {
  map.eachLayer((layer: leaflet.Rectangle) => {
    if (layer instanceof leaflet.Rectangle) {
      map.removeLayer(layer);
    }
  });
};

const upButton = document.createElement("button");
upButton.innerHTML = "⬆️";
upButton.addEventListener("click", () => {
  updatePlayerLocation(playerLocation.lat + tileDegrees, playerLocation.lng);
});
statusPanel.append(upButton);

const downButton = document.createElement("button");
downButton.innerHTML = "⬇️";
downButton.addEventListener("click", () => {
  updatePlayerLocation(playerLocation.lat - tileDegrees, playerLocation.lng);
});
statusPanel.append(downButton);

const leftButton = document.createElement("button");
leftButton.innerHTML = "⬅️";
leftButton.addEventListener("click", () => {
  updatePlayerLocation(playerLocation.lat, playerLocation.lng - tileDegrees);
});
statusPanel.append(leftButton);

const rightButton = document.createElement("button");
rightButton.innerHTML = "➡️";
rightButton.addEventListener("click", () => {
  updatePlayerLocation(playerLocation.lat, playerLocation.lng + tileDegrees);
});
statusPanel.append(rightButton);

const playerCoin: Coin[] = [];
const coinText = document.createElement("p");
coinText.innerHTML = "Storage: <div id=coins></div>";
statusPanel.append(coinText);

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

    counterUpdate(cache, popupDiv);

    popupDiv.querySelector<HTMLButtonElement>("#collect")!.addEventListener(
      "click",
      () => {
        collectCoin(cache);
        counterUpdate(cache, popupDiv);
        cacheUpdate(cache, popupDiv);
      },
    );
    popupDiv.querySelector<HTMLButtonElement>("#deposit")!.addEventListener(
      "click",
      () => {
        depositCoin(cache);
        counterUpdate(cache, popupDiv);
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

function counterUpdate(cache: Geocache, popupDiv: HTMLDivElement) {
  const cacheCoord = [cache.i, cache.j].toString();
  momentos.set(cacheCoord, cache.momento.toMomento());

  const availableCoins = popupDiv.querySelector<HTMLDivElement>("#coins")!;
  availableCoins.innerHTML = "";
  cache.coins.slice(0, 3).forEach((coin) => {
    availableCoins.innerHTML += `${coin.i}:${coin.j}#${coin.serial}</br>`;
  });

  const inventoryCoins = statusPanel.querySelector<HTMLDivElement>("#coins")!;
  inventoryCoins.innerHTML = "";
  playerCoin.forEach((coin) => {
    inventoryCoins.innerHTML += `${coin.i}:${coin.j}#${coin.serial}</br>`;
  });
}

function cacheUpdate(cache: Geocache, popupDiv: HTMLDivElement) {
  const textUpdate = popupDiv.querySelector<HTMLDivElement>("#value")!;
  textUpdate.innerHTML = `
    <div id=value>There are <span id="value">${cache.coins.length} </span>coins.</div>`;
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

cacheSpawn();
