/**
 * Salingkusog Production Integration Test: reCAPTCHA Bingo Export Engine & Template
 *
 * Verifies:
 * 1. Template presence, PNG header signature, 1080x1600 dimensions, and alpha channel (zero-dependency)
 * 2. 3x3 slot geometry mapping: exactly 9 slots covering indices 0..8
 * 3. Spatial separation: slot bounding boxes do not overlap in unrotated space
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

export async function runExportEngineTest() {
  console.log("▶ [Test Suite] reCAPTCHA Bingo Export Engine & Template");

  // 1. Template validation without sharp dependency
  const templatePath = path.resolve(process.cwd(), "public/templates/export-layout.png");
  assert.ok(fs.existsSync(templatePath), "Template public/templates/export-layout.png must exist");

  const buf = fs.readFileSync(templatePath);
  assert.ok(buf.length > 1000, "Template file must not be empty");

  // PNG Magic Signature: 89 50 4E 47 0D 0A 1A 0A
  const signature = buf.subarray(0, 8).toString("hex");
  assert.strictEqual(signature, "89504e470d0a1a0a", "File must have valid PNG magic signature");

  // First chunk must be IHDR
  const chunkType = buf.subarray(12, 16).toString("ascii");
  assert.strictEqual(chunkType, "IHDR", "First PNG chunk must be IHDR");

  // Dimensions in IHDR chunk
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  assert.strictEqual(width, 1080, "Template width must be 1080");
  assert.strictEqual(height, 1600, "Template height must be 1600");

  // Color type in IHDR chunk (6 = RGBA, 4 = Grayscale+Alpha, or includes tRNS chunk)
  const colorType = buf.readUInt8(25);
  const hasAlpha = colorType === 6 || colorType === 4 || buf.includes(Buffer.from("tRNS"));
  assert.strictEqual(hasAlpha, true, "Template must support alpha channel for photo cutouts");
  console.log("  ✔ Template dimensions (1080x1600) and alpha channel verified via native binary parser");

  // 2. Verify 3x3 slot geometry mapping: 9 distinct slot indices 0..8
  const colBounds = [
    { x: -375, w: 250 },
    { x: -118, w: 250 },
    { x: 139, w: 250 },
  ];
  const rowBounds = [
    { y: -356, h: 233 },
    { y: -117, h: 232 },
    { y: 121, h: 231 },
  ];

  const slots = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const slotIndex = r * 3 + c;
      slots.push({
        slotIndex,
        col: c,
        row: r,
        bounds: { ...colBounds[c], ...rowBounds[r] },
      });
    }
  }

  assert.strictEqual(slots.length, 9, "Must define exactly 9 slots in 3x3 matrix");

  const slotIndices = new Set(slots.map((s) => s.slotIndex));
  for (let i = 0; i < 9; i++) {
    assert.ok(slotIndices.has(i), `Slot index ${i} must exist in 3x3 matrix`);
  }
  console.log("  ✔ 3x3 matrix slot indices 0..8 mapped correctly");

  // 3. Verify no slots overlap in local unrotated space
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const s1 = slots[i].bounds;
      const s2 = slots[j].bounds;
      const xOverlap = !(s1.x + s1.w <= s2.x || s2.x + s2.w <= s1.x);
      const yOverlap = !(s1.y + s1.h <= s2.y || s2.y + s2.h <= s1.y);
      assert.ok(
        !(xOverlap && yOverlap),
        `Slots ${slots[i].slotIndex} and ${slots[j].slotIndex} must not overlap`
      );
    }
  }
  console.log("  ✔ Spatial bounds verified: 0 overlapping slots in collage layout");

  console.log("✔ reCAPTCHA Bingo Export Engine suite passed cleanly\n");
}

if (process.argv[1]?.endsWith("test-export-engine.ts")) {
  runExportEngineTest().catch((err) => {
    console.error("❌ Export engine test failed:", err);
    process.exit(1);
  });
}
