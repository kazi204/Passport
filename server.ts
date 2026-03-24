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

// Use os.tmpdir() for uploads on Netlify or Cloud Run, otherwise use local uploads/
const isCloud = process.env.NETLIFY || process.env.K_SERVICE || process.env.GAE_SERVICE || process.env.LAMBDA_TASK_ROOT || process.env.NODE_ENV === "production";
const UPLOADS_DIR = isCloud ? path.join(os.tmpdir(), "uploads") : path.join(__dirname, "uploads");

console.log("Environment:", { 
  isCloud, 
  NETLIFY: process.env.NETLIFY, 
  NODE_ENV: process.env.NODE_ENV,
  UPLOADS_DIR 
});

if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create uploads directory:", err);
  }
}

async function createServer() {
  const app = express();
  const PORT = 3000;
  
  const upload = multer({ dest: UPLOADS_DIR });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Health check
  app.get("/api/health", (req, res) => {
    let sharpStatus = "unknown";
    try {
      sharpStatus = sharp ? "loaded" : "missing";
    } catch (e) {
      sharpStatus = "error: " + (e instanceof Error ? e.message : String(e));
    }

    res.json({ 
      status: "ok", 
      time: new Date().toISOString(),
      env: process.env.NODE_ENV,
      isNetlify: !!process.env.NETLIFY,
      sharp: sharpStatus,
      uploadsDir: UPLOADS_DIR,
      uploadsDirExists: fs.existsSync(UPLOADS_DIR)
    });
  });

  // API Routes
  app.post("/api/upload", (req, res, next) => {
    console.log("Incoming upload request...");
    upload.single("image")(req, res, (err) => {
      if (err) {
        console.error("Multer error during upload:", err);
        return res.status(500).json({ 
          error: "File upload failed", 
          details: err.message,
          code: err.code 
        });
      }
      
      if (!req.file) {
        console.error("No file received in request. Body:", req.body);
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      console.log("File successfully uploaded to:", req.file.path);
      res.json({ 
        filename: req.file.filename, 
        path: req.file.path,
        size: req.file.size
      });
    });
  });

  app.post("/api/remove-bg", async (req, res) => {
    const { filename } = req.body;
    console.log("POST /api/remove-bg", filename);
    const filePath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      console.error("File not found for remove-bg:", filePath);
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
      const errorMsg = error.response?.data?.toString() || error.message;
      console.error("Remove BG Error:", errorMsg);
      
      let userFriendlyError = "Failed to remove background.";
      if (error.response?.status === 403 || error.response?.status === 401) {
        userFriendlyError = "Background removal API key is invalid or exhausted. Please check your REMOVE_BG_API_KEY environment variable.";
      } else if (error.response?.status === 429) {
        userFriendlyError = "Background removal rate limit exceeded. Please try again later.";
      }
      
      res.status(500).json({ error: userFriendlyError, details: errorMsg });
    }
  });

  app.post("/api/generate-single", async (req, res) => {
    const { filename, bgColor, size, customWidth, customHeight } = req.body;
    console.log("POST /api/generate-single", { filename, bgColor, size });
    const filePath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      console.error("File not found for generate-single:", filePath);
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
    console.log("POST /api/generate-layout", { filename, bgColor, size, copies });
    const filePath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      console.error("File not found for generate-layout:", filePath);
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

