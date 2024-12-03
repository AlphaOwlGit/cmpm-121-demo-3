import { Coin } from "./main.ts";

function createButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.innerHTML = label;
  button.addEventListener("click", onClick);
  return button;
}

export function setupMovementButtons(
  statusPanel: HTMLElement,
  moveCallbacks: {
    up: () => void;
    down: () => void;
    left: () => void;
    right: () => void;
  },
) {
  const upButton = createButton("⬆️", moveCallbacks.up);
  const downButton = createButton("⬇️", moveCallbacks.down);
  const leftButton = createButton("⬅️", moveCallbacks.left);
  const rightButton = createButton("➡️", moveCallbacks.right);
  statusPanel.append(upButton, downButton, leftButton, rightButton);
}

export function setupResetButton(
  statusPanel: HTMLElement,
  onReset: () => void,
) {
  const resetButton = createButton("🚮", () => {
    const confirm = prompt(
      "Are you sure you want to reset the game state? Type 'YES' to confirm.",
    );
    if (confirm === "YES") {
      onReset();
    }
  });
  statusPanel.append(resetButton);
}

export function updateInventory(
  statusPanel: HTMLElement,
  playerCoin: Coin[],
  onClickCoin: (coin: Coin) => void,
) {
  const inventoryCoins = statusPanel.querySelector<HTMLDivElement>("#coins")!;
  inventoryCoins.innerHTML = "";
  playerCoin.forEach((coin) => {
    const coinDiv = document.createElement("div");
    coinDiv.innerHTML = `${coin.i}:${coin.j}#${coin.serial}`;
    coinDiv.classList.add("coin");
    coinDiv.addEventListener("click", () => {
      onClickCoin(coin);
    });
    inventoryCoins.append(coinDiv);
  });
}
