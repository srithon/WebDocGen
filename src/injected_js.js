const sleep = (milliseconds) => {
  return new Promise((resolve) =>
    setTimeout(() => resolve(undefined), milliseconds)
  );
};

// add empty div for use as dim overlay
const dimOverlayDiv = document.createElement("div");
document.querySelector("body").appendChild(dimOverlayDiv);

const highlight = async (selector, makeBackgroundDark) => {
  dimOverlayDiv.classList.add("dim-overlay");

  if (makeBackgroundDark) {
    dimOverlayDiv.classList.add("dark-overlay");
  }

  document.querySelector(selector).classList.add("dim-overlay-highlight");
  await sleep(20);
};

const unhighlight = async (selector, wasBackgroundDark) => {
  dimOverlayDiv.classList.remove("dim-overlay");

  if (wasBackgroundDark) {
    dimOverlayDiv.classList.remove("dark-overlay");
  }

  document.querySelector(selector).classList.remove("dim-overlay-highlight");
  await sleep(20);
};
