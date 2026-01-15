import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";
import fs from "fs";

// Configure PDF.js to use the Node.js canvas
const NodeCanvasFactory = {
  create(width, height) {
    const canvas = createCanvas(width, height);
    return {
      canvas,
      context: canvas.getContext("2d"),
    };
  },
  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  },
  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  },
};

async function testPdfConversion() {
  // Test canvas creation
  try {
    const testCanvas = NodeCanvasFactory.create(100, 100);
    NodeCanvasFactory.destroy(testCanvas);

  } catch (error) {
    console.error("❌ Canvas creation failed:", error);
    process.exit(1);
  }
}

testPdfConversion().catch(console.error);
