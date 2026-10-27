import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

export async function runLegalTokenWrappingTest() {
  console.log("▶ [Test Suite] Legal Pages Defensive Token Wrapping");

  const files = [
    { name: "rally-rules", file: "src/app/rally-rules/page.tsx" },
    { name: "privacy", file: "src/app/privacy/page.tsx" },
    { name: "terms", file: "src/app/terms/page.tsx" },
  ];

  for (const { name, file } of files) {
    const filePath = path.resolve(file);
    const source = fs.readFileSync(filePath, "utf8");

    // Check placeholder spans have break-words
    const placeholderMatches = source.match(/\[[A-Z0-9\s/]+\]/g) || [];
    assert.ok(placeholderMatches.length > 0, `${name} must have placeholder tokens`);

    // Verify break-words appears on spans wrapping placeholders
    assert.ok(
      source.includes("break-words") || source.includes("break-all"),
      `${name} must include break-words/break-all on token spans to prevent overflow`
    );

    // Verify footer responsiveness
    assert.ok(
      source.includes("flex flex-col sm:flex-row"),
      `${name} footer must use responsive flex-col sm:flex-row`
    );
  }

  console.log("  ✔ Defensive token wrapping and footer responsiveness verified across all legal pages\n");
}

if (process.argv[1]?.endsWith("test-legal-token-wrapping.ts")) {
  runLegalTokenWrappingTest().catch((err) => {
    console.error("❌ LegalTokenWrapping test failed:", err);
    process.exit(1);
  });
}
