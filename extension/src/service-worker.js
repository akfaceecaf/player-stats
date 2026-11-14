import { searchText, filterMatches, toSearchString } from "./lib/utils.js";
const API_URL = "http://127.0.0.1:8000";

// Fetch list of NBA players
const getPlayers = async () => {
  const res = await fetch(`${API_URL}/players`);
  return res.json();
};

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

async function getPlayerData(playerId) {
  const res = await fetch(`${API_URL}/stats/${playerId}`).then((res) =>
    res.json(),
  );
  return res;
}

async function lookup(playerId) {
  try {
    const data = await getPlayerData(playerId);
    if (!data) throw new Error("No player data");
    return { ok: true, data };
  } catch (e) {
    return { ok: false, message: e.message };
  }
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
