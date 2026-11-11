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
    const res = response.data;
    highlight.clear();
    mappedNodes.clear();

    res.forEach((matches, i) => {
      if (matches.length > 0) {
        // trace match back to node using index
        const node = nodes[i];
        const players = [];
        // for each match create a new range, add to highlight
        matches.forEach(({ start, end, text, player }) => {
          const range = new Range();
          range.setStart(node, start);
          range.setEnd(node, end + 1);
          highlight.add(range);
          const p = {
            start,
            end,
            node,
            range,
            text,
            player,
          };
          players.push(p);

          // map node to check if if valid player string at caretPosition
          mappedNodes.set(node, players);
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
  let popup;
  let popupPlayer;
  let popupData;

  // // create a popup to display player's stats
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

  // renders the popup
  function renderPopup() {
    if (!popupPlayer || !popupData) return;

    popup?.remove();
    popup = document.createElement("div");
    // create a bounding box around the name to visualize area
    const clientRect = popupPlayer.range.getBoundingClientRect();
    popup.textContent = popupData.firstName;
    popup.className = "popup";
    popup.style.left = `${clientRect.left + window.scrollX}px`;
    popup.style.top = `${clientRect.top + window.scrollY}px`;
    popup.style.width = `200px`;
    popup.style.height = `200px`;
    document.body.appendChild(popup);
  }

  // EVENT LISTENERS
  // add event listener for mouse pointer position
  document.addEventListener("pointermove", (e) => {
    // check if pointer is on a valid player node and range
    const player = onPlayer(e.clientX, e.clientY);
    if (player !== popupPlayer) showPopup(player);
  });
})();
