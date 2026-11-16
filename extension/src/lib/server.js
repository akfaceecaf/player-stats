import { FailedToFetchError } from "./errors.js";

const API_URL = "http://127.0.0.1:8000";

// central fetch function to handle api requests
async function fetchData(endpoint) {
  let res;
  try {
    res = await fetch(`${API_URL}/${endpoint}`);
  } catch (e) {
    throw new FailedToFetchError("unable to connect to player-stats server");
  }
  if (!res.ok) {
    let err;
    const contentType = res.headers.get("content-type");
    // errors with json and message kw arg are nba data specific errors
    if (contentType?.includes("application/json")) {
      err = await res.json();
      if (err.message) {
        throw new FailedToFetchError(err.message);
      }
    }
    throw new Error(`unexpected error occured at /${endpoint}: ${res.status}`);
  }
  return res.json();
}

export async function getPlayerData(playerId) {
  return fetchData(`stats/${playerId}`);
}

// Fetch list of NBA players
export const getPlayers = async () => {
  return fetchData("players");
};
