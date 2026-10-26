import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

export async function runLegalHeaderResponsiveTest() {
  console.log("▶ [Test Suite] Legal Header Mobile Responsiveness");

  const headerPath = path.resolve("src/components/legal/legal-header.tsx");
  const source = fs.readFileSync(headerPath, "utf8");

  // 1. Assert shortLabel is configured in tabs array
  assert.ok(source.includes('shortLabel: "Privacy"'), "Tabs array must define shortLabel for Privacy");
  assert.ok(source.includes('shortLabel: "Terms"'), "Tabs array must define shortLabel for Terms");
  assert.ok(source.includes('shortLabel: "Rules"'), "Tabs array must define shortLabel for Rally & Raffle Rules");

  // 2. Assert back button responsive labels
  assert.ok(
    source.includes('sm:hidden') && source.includes(">Board</span>"),
    "Back button must contain condensed 'Board' label for mobile screens"
  );
  assert.ok(
    source.includes('hidden sm:inline') && source.includes(">Campus Board</span>"),
    "Back button must contain full 'Campus Board' label for desktop"
  );

  // 3. Assert nav scrollable track utility classes
  assert.ok(source.includes("overflow-x-auto"), "Nav container must support horizontal scrolling via overflow-x-auto");
  assert.ok(source.includes("no-scrollbar"), "Nav container must hide scrollbar via no-scrollbar");
  assert.ok(source.includes("whitespace-nowrap"), "Nav container must prevent pill wrapping via whitespace-nowrap");

  // 4. Assert tab links render dual responsive label spans
  assert.ok(source.includes("{tab.shortLabel}"), "Tab link must render tab.shortLabel for mobile");
  assert.ok(source.includes("{tab.label}"), "Tab link must render tab.label for desktop");

  console.log("  ✔ LegalHeader responsive structure, labels, and scroll classes verified\n");
}

if (process.argv[1]?.endsWith("test-legal-header-responsive.ts")) {
  runLegalHeaderResponsiveTest().catch((err) => {
    console.error("❌ LegalHeader responsive test failed:", err);
    process.exit(1);
  });
}
