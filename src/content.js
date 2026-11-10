(() => {
  const SKIP_SELECTORS = "style, script, button";

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
      console.log("Error");
      return;
    }

    // iterate through all nodes, for every valid node add highlight range
    const highlight = new Highlight();
    const res = response.data;
    res.forEach((matches, i) => {
      if (matches.length > 0) {
        // trace match back to node using index
        const node = nodes[i];
        // for each match create a new range, add to highlight
        matches.forEach(({ start, end }) => {
          const range = new Range();
          range.setStart(node, start);
          range.setEnd(node, end + 1);
          highlight.add(range);
        });
      }
    });

    CSS.highlights.set("player-highlight", highlight);
  }

  parse();
})();
