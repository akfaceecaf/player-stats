import AhoCorasick from "./ahocorasick.js";

export function toSearchString(player) {
  return player.fullName.toLowerCase();
}

export const filterMatches = (matches) => {
  return matches.filter((res, i) => {
    const nextResult = matches[i + 1];
    if (nextResult) {
      return nextResult.start > res.end;
    }
    return true;
  });
};

export const searchText = (text, strings) => {
  const ac = new AhoCorasick(strings);
  const results = ac.search(text);
  return results.map((res) => ({
    start: res[0] - (res[1][0].length - 1),
    end: res[0],
    text: res[1][0],
  }));
};
