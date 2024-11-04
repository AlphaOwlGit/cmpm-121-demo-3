// todo
import "./style.css";

const app: HTMLDivElement = document.querySelector("#app")!;

const gameName = "Click The Button";

document.title = gameName;

const header = document.createElement("h1");
header.innerHTML = gameName;
app.append(header);

const button = document.createElement("button");
button.innerHTML = "Click Me!";
button.addEventListener("click", () => {
  alert("you clicked the button!");
});
app.append(button);

//test
