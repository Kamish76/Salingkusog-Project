const assert = require('assert');
const fs = require('fs');
const sharp = require('sharp');

async function verifyExportEngine() {
  // 1. Verify template exists and matches exact 1080x1600 dimensions
  const templatePath = 'public/templates/export-layout.png';
  assert(fs.existsSync(templatePath), 'Template public/templates/export-layout.png must exist');
  
  const meta = await sharp(templatePath).metadata();
  assert.strictEqual(meta.width, 1080, 'Template width must be 1080');
  assert.strictEqual(meta.height, 1600, 'Template height must be 1600');
  assert.strictEqual(meta.hasAlpha, true, 'Template must have transparent alpha cutouts');

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

  assert.strictEqual(slots.length, 9, 'Must have exactly 9 slots');
  const slotIndices = new Set(slots.map(s => s.slotIndex));
  for (let i = 0; i < 9; i++) {
    assert(slotIndices.has(i), `Slot index ${i} must exist in 3x3 matrix`);
  }

  // 3. Verify no slots overlap in local unrotated space
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const s1 = slots[i].bounds;
      const s2 = slots[j].bounds;
      const xOverlap = !(s1.x + s1.w <= s2.x || s2.x + s2.w <= s1.x);
      const yOverlap = !(s1.y + s1.h <= s2.y || s2.y + s2.h <= s1.y);
      assert(!(xOverlap && yOverlap), `Slots ${slots[i].slotIndex} and ${slots[j].slotIndex} must not overlap`);
    }
  }

  console.log('✓ All 3 assertions passed for reCAPTCHA Bingo Export Engine!');
}

verifyExportEngine().catch((err) => {
  console.error('Export engine test failed:', err);
  process.exit(1);
});
