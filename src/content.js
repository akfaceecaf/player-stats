(() => {
  const SKIP_SELECTORS = "style, script, button";

  function getValidNodes() {
    // get list of valid text nodes
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
    console.log(response.data);
  }

  parse();
})();
