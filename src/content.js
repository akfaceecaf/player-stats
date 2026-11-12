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

  // POPUP FUNCTIONS
  const SUMM_TBL_C_M = {
    Season: "season",
    G: "games",
    PTS: "pts",
    TRB: "rbs",
    AST: "asts",
    "FG%": "fgPct",
    "FG3%": "fg3Pct",
    "FT%": "ftPct",
  };

  const SUMMARY_MAP = {
    Position: "position",
    Team: "team",
    ImageUrl: "imageUrl",
  };

  const host = el("div", null, "host");
  const shadow = host.attachShadow({ mode: "closed" });
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(`
  .popup {
    z-index: 999999;
    position: absolute;
    max-height: 300px;
    width: 450px;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    padding: 0.5rem;
    margin: 0.5rem;
    font-family: Verdana, sans-serif, Helvetica;
    border: 1px solid black;
    color: black;
    background-color: white;
  }

  .meta {
    display: flex;
    gap: 0.5rem;
  }

  .metadata {
    display: flex;
    flex-direction: column;
  }

  .stats-table {
    width: 80%;
    gap: 0rem;
    border: 1px solid black;
  }

  .stats-table-col-head {
    font-weight: bold;
    background-color: rgb(238, 238, 238);
    color: rgb(165, 35, 34);
  }

  .close-button {
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
    img.setAttribute("src", popupData.meta[SUMMARY_MAP["ImageUrl"]]);
    media.appendChild(img);
    meta.appendChild(media);

    // ***Metadata DIV
    const div = el("div", "metadata");
    const h1 = el("h1");
    h1.textContent = `${popupPlayer.player.firstName} ${popupPlayer.player.lastName}`;
    const p1 = el("p");
    p1.textContent = `Position: ${popupData.meta[SUMMARY_MAP["Position"]]}`;
    const p2 = el("p");
    p2.textContent = `Team: ${popupData.meta[SUMMARY_MAP["Team"]]}`;
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
      const cell = el("td");
      const cellText = document.createTextNode(col);
      cell.appendChild(cellText);
      row.appendChild(cell);
    });
    summTblBody.appendChild(row);

    // Row Values
    popupData.stats.forEach((entry, i) => {
      const row = el("tr");

      cols.forEach((col) => {
        const cell = el("td");
        const cellText = document.createTextNode(
          popupData.stats[i][SUMM_TBL_C_M[col]],
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
    // document.body.appendChild(popup);
  }

  // EVENT LISTENERS
  // add event listener for mouse pointer position
  document.addEventListener("pointermove", (e) => {
    // check if pointer is on a valid player node and range
    const player = onPlayer(e.clientX, e.clientY);
    if (player !== popupPlayer) showPopup(player);
  });
})();
