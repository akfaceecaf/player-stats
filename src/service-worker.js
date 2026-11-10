import {
  searchText,
  filterMatches,
  toSearchString,
  getPlayers,
} from "./lib/utils.js";
export const SERVER_URL = "./static/players.json";

const handleMessages = async (message, sender, sendResponse) => {
  if (message.type === "scan") {
    try {
      // get list of players
      let players;
      const cache = await chrome.storage.local.get("players");
      if (Object.keys(cache).length !== 0) {
        players = cache.players;
      } else {
        players = await getPlayers();
        chrome.storage.local.set({ players });
      }

      // process player data
      players = players.map((p) => ({ ...p, token: toSearchString(p) }));

      // scan
      const data = [];
      message.texts.forEach((text) => {
        const matches = searchText(
          text.toLowerCase(),
          players.map(({ token }) => token),
        );
        const filteredMatches = filterMatches(matches);
        data.push(filteredMatches);
      });
      return { ok: true, data };
    } catch (error) {
      console.log(error.message);
    }
  } else {
    throw new Error("Invalid message");
  }
};

chrome.runtime.onMessage.addListener(handleMessages);
