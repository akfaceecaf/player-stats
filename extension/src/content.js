(() => {
  const SKIP_SELECTORS = "style, script, button";

  const highlight = new Highlight();
  const mappedNodes = new Map();
  CSS.highlights.set("player-highlight", highlight);

  // get list of valid text nodes
  function getValidNodes() {
    let walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (node.parentElement?.closest(SKIP_SELECTORS))
            return NodeFilter.FILTER_REJECT;
          if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      },
    );
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    return nodes;
  }

  // parse document text elements and send to service worker
  async function parse() {
    const nodes = getValidNodes();
    const response = await chrome.runtime.sendMessage({
      type: "scan",
      texts: nodes.map((n) => n.nodeValue),
    });
    if (!response.ok) {
      console.log(response.message);
      return;
    }

    // iterate through all nodes, for every valid node add highlight range
    const data = response.data;
    highlight.clear();
    mappedNodes.clear();

    data.forEach((res, i) => {
      if (res.length > 0) {
        // trace match back to node using index
        const node = nodes[i];
        const matches = [];
        // for each match create a new range, add to highlight
        res.forEach(({ start, end, text, player }) => {
          const range = new Range();
          range.setStart(node, start);
          range.setEnd(node, end + 1);
          highlight.add(range);
          const match = {
            start,
            end,
            node,
            range,
            text,
            player,
          };
          matches.push(match);

          // map node to check if if valid player string at caretPosition
          mappedNodes.set(node, matches);
        });
      }
    });
  }

  parse();

  // check if there is a caret position from a point
  function onCaret(x, y) {
    if (document.caretPositionFromPoint) {
      const range = document.caretPositionFromPoint(x, y);
      if (range) {
        return { node: range.offsetNode, offset: range.offset };
      } else {
        return;
      }
    }
  }

  function onPlayer(x, y) {
    const caret = onCaret(x, y);
    if (caret) {
      // check if node and range is in valid map
      const players = mappedNodes.get(caret.node);
      if (players) {
        const player = players.find(
          (m) => m.start <= caret.offset && caret.offset <= m.end,
        );
        if (player) {
          return player;
        }
      }
    }
    return null;
  }

  // POPUP
  const SUMM_TBL_C_M = {
    Season: { key: "seasonId", format: "string" },
    Team: { key: "teamAbv", format: "string" },
    G: { key: "gp", format: "int" },
    PTS: { key: "pts", format: "float" },
    REB: { key: "reb", format: "float" },
    AST: { key: "ast", format: "float" },
    STL: { key: "stl", format: "float" },
    BLK: { key: "blk", format: "float" },
    "FG%": { key: "fgPct", format: "percent" },
    "FG3%": { key: "fg3Pct", format: "percent" },
    "FT%": { key: "ftPct", format: "percent" },
  };

  const FORMAT_MAP = {
    string: (s) => s,
    int: (s) => s,
    float: (s) => s.toFixed(1),
    percent: (s) =>
      new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(s),
  };

  function formatData(value, format) {
    return FORMAT_MAP[format](value);
  }

  const SUMMARY_MAP = {
    Position: "position",
    Team: "teamName",
    ImageUrl: "imageUrl",
  };

  const host = el("div", null, "host");
  const shadow = host.attachShadow({ mode: "closed" });
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(`
  * {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  }

  h1 {
    font-size: 1.3rem;
  }

  p {
    font-size: 0.8rem;
  }

  .popup {
    z-index: 999999;
    position: absolute;
    width: 450px;
    max-height: 300px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
    margin: 0.5rem;
    font-family: Verdana, sans-serif, Helvetica;
    border: 1px solid black;
    color: black;
    background-color: white;
  }

  .meta {
    display: grid;
    grid-template-columns: minmax(0, 3fr) minmax(0, 4fr);
    gap: 0.5rem;
  }

  .player-image {
    width: 100%;
  }

  .metadata {
    display: flex;
    flex-direction: column;
    overflow-wrap: break-word;
    padding: 0.25rem;
    gap: 0.25rem;
  }

  .summary {
    border: 1px solid black;
  }

  .summary-heading {
    margin-bottom: 0.3rem;
    color: rgb(143, 84, 0);
  }

  .stats-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.7rem;
    border: 1px solid black;
  }

  .stats-table-col-head {
    font-weight: bold;
    background-color: rgb(238, 238, 238);
    color: rgb(165, 35, 34);
  }

  .stats-table-cell {
    padding: 2px;
    gap: 0px;
    border: 1px solid black;
  }
  `);
  shadow.adoptedStyleSheets = [sheet];
  document.documentElement.append(host);

  let popup;
  let popupPlayer;
  let popupData;

  // create a popup to display player's stats
  async function showPopup(player) {
    if (!player) return;
    popupPlayer = player;
    const response = await chrome.runtime.sendMessage({
      type: "lookup",
      playerId: player.player.playerId,
    });
    if (!response.ok) {
      console.log(response.message);
      return;
    }
    // if hovered player changes while looking up player data, then don't show popup and reset
    if (popupPlayer !== hoveredPlayer) {
      popupPlayer = null;
      return;
    }
    popupData = response.data;

    // render popup once all data is returned and loaded
    renderPopup();
  }

  // function to create element and add id, className
  function el(tagName, className, id) {
    const element = document.createElement(tagName);
    if (className != null) element.className = className;
    if (id != null) element.id = id;
    return element;
  }

  function closePopup() {
    popupPlayer = null;
    popupData = null;
    popup.remove();
  }

  // renders the popup
  function renderPopup() {
    if (!popupPlayer || !popupData) return;
    popup?.remove();

    popup = el("div", "popup");

    const meta = el("div", "meta");
    // ***MEDIA DIV
    const media = el("div", "media-item");
    const img = el("img", "player-image");
    img.setAttribute("src", popupData[SUMMARY_MAP["ImageUrl"]]);
    media.appendChild(img);
    meta.appendChild(media);

    // ***Metadata DIV
    const div = el("div", "metadata");
    const h1 = el("h1");
    h1.textContent = `${popupPlayer.player.firstName} ${popupPlayer.player.lastName}`;
    const p1 = el("p");
    p1.textContent = `Position: ${popupData.metadata[SUMMARY_MAP["Position"]]}`;
    const p2 = el("p");
    p2.textContent = `Team: ${popupData.metadata[SUMMARY_MAP["Team"]]}`;
    div.appendChild(h1);
    div.appendChild(p1);
    div.appendChild(p2);
    meta.appendChild(div);

    // **Summary DIV
    const summary = el("div", "table-wrapper", "summary");

    // ***Summary Heading
    const summaryHeading = el("div", "summary-heading");
    const h2 = el("h2");
    h2.textContent = "Summary";
    summaryHeading.appendChild(h2);

    // ***Summary Table
    const summTblContainer = el("div", "summary-table-container");
    const summTbl = el("table", "stats-table", "summary");
    const summTblBody = el("tbody");
    const cols = Object.keys(SUMM_TBL_C_M);
    const row = el("tr", "stats-table-col-head");
    // Column Names
    cols.forEach((col) => {
      const cell = el("td", "stats-table-cell");
      const cellText = document.createTextNode(col);
      cell.appendChild(cellText);
      row.appendChild(cell);
    });
    summTblBody.appendChild(row);

    // Row Values
    popupData.stats.forEach((entry, i) => {
      const row = el("tr", "stats-table-row");

      cols.forEach((col) => {
        const cell = el("td", "stats-table-cell");
        const { key, format } = SUMM_TBL_C_M[col];
        const cellText = document.createTextNode(
          formatData(popupData.stats[i][key], format),
        );
        cell.appendChild(cellText);
        row.appendChild(cell);
      });
      summTblBody.appendChild(row);
    });
    summTbl.appendChild(summTblBody);
    summTblContainer.appendChild(summTbl);

    summary.appendChild(summaryHeading);
    summary.appendChild(summTblContainer);

    const closeButton = el("button", "close-button");
    closeButton.textContent = "CLOSE";
    closeButton.addEventListener("click", () => closePopup());
    popup.appendChild(closeButton);

    popup.appendChild(meta);
    popup.appendChild(summary);

    // create a bounding box around the name to visualize area
    const clientRect = popupPlayer.range.getBoundingClientRect();
    popup.style.left = `${clientRect.left + window.scrollX}px`;
    popup.style.top = `${clientRect.top + window.scrollY}px`;
    shadow.appendChild(popup);
    positionPopup(popup, popupPlayer.range);
  }

  function positionPopup(popup, range) {
    const { width, height } = popup.getBoundingClientRect();
    const clientRect = range.getBoundingClientRect();

    const margin = 25;
    const left = Math.max(
      margin,
      Math.min(clientRect.left, window.innerWidth - width - margin),
    );
    const top = Math.max(
      margin,
      Math.min(clientRect.top, window.innerHeight - height - margin),
    );
    popup.style.left = `${left + window.scrollX}px`;
    popup.style.top = `${top + window.scrollY}px`;
  }

  // EVENT LISTENERS
  POPUP_DELAY = 1000;
  let timeoutID;
  let hoveredPlayer;

  // add event listener for mouse pointer position
  document.addEventListener("pointermove", (e) => {
    // check if pointer is on a valid player node and range
    const player = onPlayer(e.clientX, e.clientY);

    // add delay for popup to check if hover was intentional
    if (!player || player !== hoveredPlayer) {
      clearTimeout(timeoutID);
      timeoutID = null;
      if (player) {
        hoveredPlayer = player;
        timeoutID = setTimeout(() => {
          showPopup(player);
          timeoutID = null;
        }, POPUP_DELAY);
      } else {
        hoveredPlayer = null;
      }
    }
  });
})();
