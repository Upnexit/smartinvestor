import fs from "node:fs";

const file = "src/routes/_authenticated/tasks.tsx";
let content = fs.readFileSync(file, "utf-8").replace(/\r\n/g, "\n");

// Replace everything below <AdWatchTaskCard /> up to the last closing div of return
const cardAnchor = `<AdWatchTaskCard />`;
const anchorIdx = content.indexOf(cardAnchor);

if (anchorIdx !== -1) {
  // Check where the return div closes
  const returnEndIdx = content.lastIndexOf(`    </div>\n  );`);
  if (returnEndIdx !== -1) {
    const newBody = `<AdWatchTaskCard />\n    </div>\n  );`;
    content = content.substring(0, anchorIdx) + newBody + content.substring(returnEndIdx + `    </div>\n  );`.length);
  }
}

fs.writeFileSync(file, content, "utf-8");
console.log("Updated tasks.tsx to focus cleanly on AdWatchTaskCard");

