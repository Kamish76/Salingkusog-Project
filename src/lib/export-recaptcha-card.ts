/**
 * Salingkusog Intramurals - Retro reCAPTCHA Collage Card Export Engine
 * Composites student-uploaded photos onto the 1080x1600 reCAPTCHA parody poster,
 * preserving the graphic artwork, collage textures, and stickers.
 */

export interface ExportBingoTask {
  id: string;
  slotIndex: number;
  title: string;
  category?: string;
  unlockDay?: number;
}

export interface ExportUserProgress {
  slotIndex: number;
  taskId: string;
  postId?: string;
  imageUrl?: string | null;
  caption?: string | null;
}

export interface ExportRecaptchaCardOptions {
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
  tasks?: ExportBingoTask[];
  userProgress: ExportUserProgress[];
}

/**
 * Robust image loader with 3-tier fallback to eliminate CORS / canvas tainting issues:
 * 1. Image element with anonymous crossOrigin
 * 2. Fetch blob + createObjectURL
 * 3. Server-side /api/image-proxy fallback
 */
function loadCanvasImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = async () => {
      try {
        // Fallback 1: Direct client fetch
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Fetch HTTP ${res.status}`);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          URL.revokeObjectURL(blobUrl);
          resolve(fallbackImg);
        };
        fallbackImg.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          tryProxy();
        };
        fallbackImg.src = blobUrl;
      } catch {
        tryProxy();
      }
    };

    const tryProxy = async () => {
      try {
        // Fallback 2: Local server proxy
        const proxyRes = await fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`);
        if (!proxyRes.ok) throw new Error(`Proxy HTTP ${proxyRes.status}`);
        const proxyBlob = await proxyRes.blob();
        const proxyBlobUrl = URL.createObjectURL(proxyBlob);
        const proxyImg = new Image();
        proxyImg.onload = () => {
          URL.revokeObjectURL(proxyBlobUrl);
          resolve(proxyImg);
        };
        proxyImg.onerror = (e) => {
          URL.revokeObjectURL(proxyBlobUrl);
          reject(e);
        };
        proxyImg.src = proxyBlobUrl;
      } catch (proxyErr) {
        reject(proxyErr);
      }
    };

    img.src = url;
  });
}

/**
 * Composites student photos onto the reCAPTCHA poster canvas.
 */
export async function generateRecaptchaBingoCardCanvas(
  options: ExportRecaptchaCardOptions
): Promise<HTMLCanvasElement> {
  const { userProgress } = options;

  // 1. Setup Canvas (1080 x 1600 matching original template asset)
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1600;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not initialize 2D canvas context");

  // 2. Base background fill (solid white for clean slot backing)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 3. Map user progress by slotIndex (0 to 8)
  const progressMap = new Map<number, ExportUserProgress>();
  for (const prog of userProgress) {
    if (prog.imageUrl) {
      progressMap.set(prog.slotIndex, prog);
    }
  }

  // 4. Preload all student-uploaded photos and template concurrently
  const [templateImg, ...loadedPhotoPairs] = await Promise.all([
    loadCanvasImage("/templates/export-layout.png"),
    ...Array.from(progressMap.entries()).map(async ([slotIdx, prog]) => {
      try {
        const photoImg = await loadCanvasImage(prog.imageUrl!);
        return [slotIdx, photoImg] as const;
      } catch (err) {
        console.warn(`Could not load photo for bingo slot ${slotIdx}:`, err);
        return null;
      }
    }),
  ]);

  const loadedPhotos = new Map<number, HTMLImageElement>();
  for (const pair of loadedPhotoPairs) {
    if (pair) loadedPhotos.set(pair[0], pair[1]);
  }

  // 5. Grid Geometry in Local Tilted Space
  // The central card is tilted clockwise by ~4.95 degrees around center (533, 898)
  const cardCenterX = 533;
  const cardCenterY = 898;
  const cardTiltAngleRad = (4.95 * Math.PI) / 180;

  // Exact measured bounds per slot column and row:
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

  ctx.save();
  ctx.translate(cardCenterX, cardCenterY);
  ctx.rotate(cardTiltAngleRad);

  // Draw 3x3 slots under the template
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const slotIndex = row * 3 + col;
      const photo = loadedPhotos.get(slotIndex);
      const { x: slotX, w: slotW } = colBounds[col];
      const { y: slotY, h: slotH } = rowBounds[row];

      if (photo) {
        ctx.save();
        // Clip to slot rectangle to prevent bleeding outside the cell
        ctx.beginPath();
        ctx.rect(slotX, slotY, slotW, slotH);
        ctx.clip();

        // Calculate aspect fill cover
        const imgAspect = photo.naturalWidth / photo.naturalHeight;
        const frameAspect = slotW / slotH;
        let sx = 0;
        let sy = 0;
        let sw = photo.naturalWidth;
        let sh = photo.naturalHeight;

        if (imgAspect > frameAspect) {
          sw = photo.naturalHeight * frameAspect;
          sx = (photo.naturalWidth - sw) / 2;
        } else {
          sh = photo.naturalWidth / frameAspect;
          sy = (photo.naturalHeight - sh) / 2;
        }

        ctx.drawImage(photo, sx, sy, sw, sh, slotX, slotY, slotW, slotH);
        ctx.restore();
      } else {
        // Empty slot: clean white fill
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(slotX, slotY, slotW, slotH);
      }
    }
  }

  ctx.restore(); // Restore from card tilt rotation

  // 6. Draw the pristine template artwork over the photos
  // This overlays the yellow title header, window frame, grid divider lines,
  // earphone cables, mouse pointer, Oblation statue, and verify buttons cleanly on top.
  ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);

  return canvas;
}

/**
 * Exports the reCAPTCHA card and triggers browser PNG download.
 */
export async function exportRecaptchaBingoCard(
  options: ExportRecaptchaCardOptions
): Promise<void> {
  const canvas = await generateRecaptchaBingoCardCanvas(options);
  const studentName =
    options.user?.name || options.user?.email?.split("@")[0] || "athlete";

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas PNG generation failed"));
          return;
        }
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const cleanName = studentName.toLowerCase().replace(/[^a-z0-9]/g, "-");
        a.href = downloadUrl;
        a.download = `salingkusog-bingo-${cleanName}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        resolve();
      },
      "image/png",
      1.0
    );
  });
}
