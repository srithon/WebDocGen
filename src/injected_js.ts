const sleep = (milliseconds: number): Promise<void> => {
  return new Promise((resolve) =>
    setTimeout(() => resolve(undefined), milliseconds)
  );
};

// add empty div for use as dim overlay
const dimOverlayDiv = document.createElement("div");
document.querySelector("body")!.appendChild(dimOverlayDiv);

const highlight = async (
  selectors: string[] | string,
  makeBackgroundDark?: boolean
): Promise<void> => {
  dimOverlayDiv.classList.add("dim-overlay");

  if (makeBackgroundDark) {
    dimOverlayDiv.classList.add("dark-overlay");
  }

  if (!Array.isArray(selectors)) {
    selectors = [selectors];
  }

  for (const selector of selectors) {
    document.querySelector(selector)!.classList.add("dim-overlay-highlight");
  }

  await sleep(20);
};

const unhighlight = async (
  selectors: string[] | string,
  wasBackgroundDark?: boolean
): Promise<void> => {
  dimOverlayDiv.classList.remove("dim-overlay");

  if (wasBackgroundDark) {
    dimOverlayDiv.classList.remove("dark-overlay");
  }

  if (!Array.isArray(selectors)) {
    selectors = [selectors];
  }

  for (const selector of selectors) {
    document.querySelector(selector)!.classList.remove("dim-overlay-highlight");
  }

  await sleep(20);
};
