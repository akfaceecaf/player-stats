async function getCurrentTab() {
  let queryOptions = { active: true, lastFocusedWindow: true };
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  let [tab] = await browser.tabs.query(queryOptions);
  return tab;
}

const scanButton = document.getElementById("scan");

// Send scan message to message handler when clicking scan
scanButton.addEventListener("click", async () => {
  const tab = await getCurrentTab();
  chrome.scripting.insertCSS({
    target: { tabId: tab.id },
    files: ["highlight.css"],
  });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["src/content.js"],
  });
});
