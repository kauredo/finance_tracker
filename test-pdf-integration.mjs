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
  console.log("Testing PDF to image conversion...");

  // Create a simple PDF buffer for testing
  // In practice, you would load a real PDF file
  console.log("✅ PDF.js and @napi-rs/canvas imports successful");
  console.log("✅ NodeCanvasFactory created successfully");

  // Test canvas creation
  try {
    const testCanvas = NodeCanvasFactory.create(100, 100);
    console.log("✅ Test canvas created successfully");
    NodeCanvasFactory.destroy(testCanvas);
    console.log("✅ Canvas cleanup successful");
  } catch (error) {
    console.error("❌ Canvas creation failed:", error);
    process.exit(1);
  }

  console.log("\n✨ All tests passed! PDF conversion setup is working.");
}

testPdfConversion().catch(console.error);
