import {
  searchText,
  filterMatches,
  toSearchString,
} from "./lib/playerSearch.js";
import { getPlayers, getPlayerData } from "./lib/server.js";
import { FailedToFetchError } from "./lib/errors.js";

let players;

async function parse(texts) {
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
  return data;
}

async function lookup(playerId) {
  const data = await getPlayerData(playerId);
  return data;
}

const handleMessages = async (message, sender, sendResponse) => {
  try {
    let data;
    if (message.type === "scan") {
      data = await parse(message.texts);
    } else if (message.type === "lookup") {
      data = await lookup(message.playerId);
    } else {
      throw new Error("invalid message type");
    }
    return { ok: true, data };
  } catch (err) {
    if (err instanceof FailedToFetchError) {
      return { ok: false, message: err.message };
    }
    console.error("[player-stats]", err);
    return { ok: false, message: "An unexpected error occured" };
  }
};

chrome.runtime.onMessage.addListener(handleMessages);
