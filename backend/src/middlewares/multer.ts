import multer from "multer";
import * as path from "path";
import * as fs from "fs";
import os from "os";

// Prefer explicit env var, fall back to project public/temp, then OS tmp dir.
const uploadDir = path.resolve(process.cwd(), "public", "temp") || path.join(os.tmpdir(), "know-your-terms-uploads");
try {
  fs.mkdirSync(uploadDir, { recursive: true });
} catch (err) {
  console.error("Failed to create upload directory:", err);
  throw err;
}

const storage = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, uploadDir);
  },
  filename: function (req: any, file: any, cb: any) {
    // use timestamp + original name to avoid collisions
    const safeName = `${Date.now()}-${file.originalname}`;
    cb(null, safeName);
  },
});

export const upload = multer({
  storage,
});