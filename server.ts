import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import path from "path";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import sharp from "sharp";
import PDFDocument from "pdfkit";
import { fileURLToPath } from "url";

import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use os.tmpdir() for uploads on Netlify, otherwise use local uploads/
const UPLOADS_DIR = process.env.NETLIFY ? path.join(os.tmpdir(), "uploads") : path.join(__dirname, "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const upload = multer({ dest: UPLOADS_DIR });

async function createServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API Routes
  app.post("/api/upload", upload.single("image"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({ filename: req.file.filename, path: req.file.path });
  });

  app.post("/api/remove-bg", async (req, res) => {
    const { filename } = req.body;
    const filePath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    try {
      // Step 2: Enhance image before sending to remove.bg
      const enhancedFilename = `enhanced-${filename}`;
      const enhancedPath = path.join(UPLOADS_DIR, enhancedFilename);
      
      await sharp(filePath)
        .modulate({ brightness: 1.05, saturation: 1.1 })
        .sharpen()
        .toFile(enhancedPath);

      const formData = new FormData();
      formData.append("image_file", fs.createReadStream(enhancedPath));
      formData.append("size", "auto");

      const response = await axios.post("https://api.remove.bg/v1.0/removebg", formData, {
        headers: {
          ...formData.getHeaders(),
          "X-Api-Key": process.env.REMOVE_BG_API_KEY || "9RLziYYRexTvk6Jn61YwzEUe",
        },
        responseType: "arraybuffer",
      });

      const outputFilename = `no-bg-${path.parse(filename).name}.png`;
      const outputPath = path.join(UPLOADS_DIR, outputFilename);
      fs.writeFileSync(outputPath, response.data);

      console.log(`Saved background-removed image: ${outputFilename}`);
      res.json({ filename: outputFilename });
    } catch (error: any) {
      console.error("Remove BG Error:", error.response?.data?.toString() || error.message);
      res.status(500).json({ error: "Failed to remove background" });
    }
  });

  app.post("/api/generate-single", async (req, res) => {
    const { filename, bgColor, size, customWidth, customHeight } = req.body;
    const filePath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    try {
      const sizes: Record<string, { w: number; h: number }> = {
        us: { w: 50.8, h: 50.8 },
        eu: { w: 35, h: 45 },
        custom: { w: 40, h: 50 },
      };

      let targetSize = sizes[size] || sizes.eu;
      if (size === "manual" && customWidth && customHeight) {
        targetSize = { w: customWidth, h: customHeight };
      }

      const dpi = 300;
      const mmToPx = (mm: number) => Math.round((mm * dpi) / 25.4);
      const photoWidth = mmToPx(targetSize.w);
      const photoHeight = mmToPx(targetSize.h);

      const resizedPhoto = await sharp(filePath)
        .resize(photoWidth, photoHeight, { fit: "cover" })
        .toBuffer();

      const singleBuffer = await sharp({
        create: {
          width: photoWidth,
          height: photoHeight,
          channels: 4,
          background: bgColor || "#ffffff",
        },
      })
        .composite([{ input: resizedPhoto }])
        .png()
        .toBuffer();

      const singleFilename = `single-${path.parse(filename).name}.png`;
      const singlePath = path.join(UPLOADS_DIR, singleFilename);
      fs.writeFileSync(singlePath, singleBuffer);

      res.json({ filename: singleFilename });
    } catch (error: any) {
      console.error("Single Image Error:", error.message);
      res.status(500).json({ error: "Failed to generate single image" });
    }
  });

  app.post("/api/generate-layout", async (req, res) => {
    const { filename, bgColor, size, copies, customWidth, customHeight } = req.body;
    const filePath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    try {
      const sizes: Record<string, { w: number; h: number }> = {
        us: { w: 50.8, h: 50.8 },
        eu: { w: 35, h: 45 },
        custom: { w: 40, h: 50 },
      };

      let targetSize = sizes[size] || sizes.eu;
      if (size === "manual" && customWidth && customHeight) {
        targetSize = { w: customWidth, h: customHeight };
      }

      const dpi = 300;
      const mmToPx = (mm: number) => Math.round((mm * dpi) / 25.4);

      const photoWidth = mmToPx(targetSize.w);
      const photoHeight = mmToPx(targetSize.h);

      const resizedPhoto = await sharp(filePath)
        .resize(photoWidth, photoHeight, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .toBuffer();

      const photoWithBg = await sharp({
        create: {
          width: photoWidth,
          height: photoHeight,
          channels: 4,
          background: bgColor || "#ffffff",
        },
      })
        .composite([{ input: resizedPhoto, gravity: "center" }])
        .png()
        .toBuffer();

      const a4Width = mmToPx(210);
      const a4Height = mmToPx(297);
      const margin = mmToPx(10);
      const spacing = mmToPx(5);

      const cols = Math.floor((a4Width - 2 * margin + spacing) / (photoWidth + spacing));
      const rows = Math.floor((a4Height - 2 * margin + spacing) / (photoHeight + spacing));

      const totalCopies = Math.min(copies || 1, cols * rows);
      const composites = [];

      for (let i = 0; i < totalCopies; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        composites.push({
          input: photoWithBg,
          left: margin + col * (photoWidth + spacing),
          top: margin + row * (photoHeight + spacing),
        });
      }

      const layoutBuffer = await sharp({
        create: {
          width: a4Width,
          height: a4Height,
          channels: 4,
          background: "#ffffff",
        },
      })
        .composite(composites)
        .png()
        .toBuffer();

      const layoutFilename = `layout-${path.parse(filename).name}.png`;
      const layoutPath = path.join(UPLOADS_DIR, layoutFilename);
      fs.writeFileSync(layoutPath, layoutBuffer);

      console.log(`Generated layout: ${layoutFilename}, size: ${layoutBuffer.length} bytes`);
      res.json({ filename: layoutFilename });
    } catch (error: any) {
      console.error("Layout Error:", error.message);
      res.status(500).json({ error: "Failed to generate layout" });
    }
  });

  app.post("/api/download-pdf", async (req, res) => {
    const { filename } = req.body;
    const filePath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    const doc = new PDFDocument({ size: "A4", margin: 0 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=passport-photos.pdf`);

    doc.pipe(res);
    doc.image(filePath, 0, 0, { width: 595.28, height: 841.89 });
    doc.end();
  });

  // Serve uploaded files
  app.use("/uploads", express.static(UPLOADS_DIR));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.NETLIFY) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  return app;
}

export { createServer };

// Start server if not running as a function
if (!process.env.NETLIFY && process.env.NODE_ENV !== "test") {
  createServer().then((app) => {
    app.listen(3000, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:3000`);
    });
  });
}

