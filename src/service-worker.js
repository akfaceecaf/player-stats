import {
  searchText,
  filterMatches,
  toSearchString,
  getPlayers,
} from "./lib/utils.js";
export const SERVER_URL = "./static/players.json";

let players;

async function parse(texts) {
  try {
    // get list of players
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
    texts.forEach((text) => {
      const matches = searchText(
        text.toLowerCase(),
        players.map(({ token }) => token),
      );
      const filteredMatches = filterMatches(matches).map((m) => ({
        ...m,
        player: players.find((p) => p.token === m.text),
      }));
      data.push(filteredMatches);
    });
    return { ok: true, data };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

async function getPlayer(playerId) {
  return await players.find((p) => p.playerId === playerId);
}

async function lookup(playerId) {
  const data = await getPlayer(playerId);
  if (!data) return { ok: false, message: "Could not fetch data" };
  return { ok: true, data };
}

const handleMessages = async (message, sender, sendResponse) => {
  if (message.type === "scan") {
    return parse(message.texts);
  } else if (message.type === "lookup") {
    return lookup(message.playerId);
  } else {
    throw new Error("Invalid message");
  }
};

chrome.runtime.onMessage.addListener(handleMessages);
