const sleep = (milliseconds) => {
  return new Promise((resolve) =>
    setTimeout(() => resolve(undefined), milliseconds)
  );
};

// add empty div for use as dim overlay
const dimOverlayDiv = document.createElement("div");
document.querySelector("body").appendChild(dimOverlayDiv);

const highlight = async (selector) => {
  dimOverlayDiv.classList.add("dim-overlay");
  document.querySelector(selector).classList.add("dim-overlay-highlight");
  await sleep(20);
};

const unhighlight = async (selector) => {
  dimOverlayDiv.classList.remove("dim-overlay");
  document.querySelector(selector).classList.remove("dim-overlay-highlight");
  await sleep(20);
};
