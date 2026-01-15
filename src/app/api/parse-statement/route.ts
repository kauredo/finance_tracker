import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseStatementWithVision, parseStatementWithAI } from "@/lib/openai";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";
import jschardet from "jschardet";
import iconv from "iconv-lite";
import Papa from "papaparse";

// Configure PDF.js to use the Node.js canvas
const NodeCanvasFactory = {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    return {
      canvas,
      context: canvas.getContext("2d"),
    };
  },
  reset(canvasAndContext: any, width: number, height: number) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  },
  destroy(canvasAndContext: any) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  },
};

export async function POST(req: NextRequest) {
  try {
    // 1. Check authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 },
      );
    }

    // 2. Initialize Supabase client with user's token to respect RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      },
    );

    // 3. Get request body
    const { files, accountId } = await req.json();

    if (!files || !Array.isArray(files) || files.length === 0 || !accountId) {
      return NextResponse.json(
        { error: "Missing required fields: files (array), accountId" },
        { status: 400 },
      );
    }

    // Validate all file types
    for (const file of files) {
      const isImage = ["image/png", "image/jpeg", "image/jpg"].includes(
        file.fileType,
      );
      const isPdf =
        file.fileType === "application/pdf" || file.filePath.endsWith(".pdf");
      const isCsvTsv =
        file.fileType.includes("csv") ||
        file.fileType.includes("tsv") ||
        file.filePath.endsWith(".csv") ||
        file.filePath.endsWith(".tsv");

      if (!isImage && !isPdf && !isCsvTsv) {
        return NextResponse.json(
          { error: "Only PNG, JPEG, PDF, CSV, and TSV files are supported." },
          { status: 400 },
        );
      }
    }

    // 4. Separate files by type
    const imageFiles = files.filter((f) =>
      ["image/png", "image/jpeg", "image/jpg"].includes(f.fileType),
    );
    const pdfFiles = files.filter(
      (f) => f.fileType === "application/pdf" || f.filePath.endsWith(".pdf"),
    );
    const textFiles = files.filter(
      (f) =>
        f.fileType.includes("csv") ||
        f.fileType.includes("tsv") ||
        f.filePath.endsWith(".csv") ||
        f.filePath.endsWith(".tsv"),
    );

    const transactions: any[] = [];

    // 5. Process image files with Vision API
    if (imageFiles.length > 0) {
      const base64Images: string[] = [];

      for (const file of imageFiles) {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("statements")
          .download(file.filePath);

        if (downloadError) {
          console.error("Storage download error:", downloadError);
          return NextResponse.json(
            { error: "Failed to download file" },
            { status: 500 },
          );
        }

        const arrayBuffer = await fileData.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString("base64");
        base64Images.push(base64Image);
      }

      const imageTransactions = await parseStatementWithVision(base64Images);

      transactions.push(...imageTransactions);
    }

    // 5b. Process PDF files by converting to images
    if (pdfFiles.length > 0) {
      const base64Images: string[] = [];

      for (const file of pdfFiles) {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("statements")
          .download(file.filePath);

        if (downloadError) {
          console.error("Storage download error:", downloadError);
          return NextResponse.json(
            { error: "Failed to download PDF file" },
            { status: 500 },
          );
        }

        // Convert PDF to images
        try {
          const arrayBuffer = await fileData.arrayBuffer();
          const typedArray = new Uint8Array(arrayBuffer);

          // Load the PDF document
          const pdfDocument = await pdfjsLib.getDocument({
            data: typedArray,
            useSystemFonts: true,
          }).promise;

          const numPages = pdfDocument.numPages;

          // Process each page
          for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdfDocument.getPage(pageNum);

            // Use a high scale for better quality
            const scale = 2.0;
            const viewport = page.getViewport({ scale });

            // Create canvas
            const canvasFactory = NodeCanvasFactory.create(
              viewport.width,
              viewport.height,
            );

            // Render PDF page to canvas
            await page.render({
              canvasContext: canvasFactory.context as any,
              viewport: viewport,
              canvas: canvasFactory.canvas as any,
            }).promise;

            // Convert canvas to base64 PNG
            const base64Image = canvasFactory.canvas
              .toBuffer("image/png")
              .toString("base64");
            base64Images.push(base64Image);

            // Clean up
            NodeCanvasFactory.destroy(canvasFactory);
          }
        } catch (pdfError: any) {
          console.error("PDF processing error:", pdfError);
          return NextResponse.json(
            { error: `Failed to process PDF: ${pdfError.message}` },
            { status: 500 },
          );
        }
      }

      const pdfTransactions = await parseStatementWithVision(base64Images);

      transactions.push(...pdfTransactions);
    }

    // 6. Process CSV/TSV files with text parsing
    if (textFiles.length > 0) {
      for (const file of textFiles) {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("statements")
          .download(file.filePath);

        if (downloadError) {
          console.error("Storage download error:", downloadError);
          return NextResponse.json(
            { error: "Failed to download file" },
            { status: 500 },
          );
        }

        // Get raw buffer
        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Detect encoding
        const detected = jschardet.detect(buffer);
        const encoding = detected.encoding || "utf-8";

        // Decode content
        let fileContent = iconv.decode(buffer, encoding);

        // Determine file type
        const fileType = file.filePath.endsWith(".csv")
          ? ("csv" as const)
          : ("text" as const);

        // Parse CSV/TSV to JSON if possible
        if (fileType === "csv" || file.filePath.endsWith(".tsv")) {
          const parseResult = Papa.parse(fileContent, {
            header: true,
            skipEmptyLines: true,
          });

          if (parseResult.errors.length > 0) {
            console.warn(
              `CSV parsing warnings for ${file.filePath}:`,
              parseResult.errors,
            );
          }

          // If parsing was successful and we have data, use the JSON string
          if (parseResult.data && parseResult.data.length > 0) {
            fileContent = JSON.stringify(parseResult.data, null, 2);
          }
        }

        const textTransactions = await parseStatementWithAI(
          fileContent,
          fileType,
        );

        transactions.push(...textTransactions);
      }
    }

    // 7. Get existing transactions for this account to detect duplicates
    const { data: existingTransactions, error: fetchError } = await supabase
      .from("transactions")
      .select("date, amount, description")
      .eq("account_id", accountId);

    if (fetchError) {
      console.error("Error fetching existing transactions:", fetchError);
      // Continue anyway - better to have duplicates than fail
    }

    // 8. Get categories to map names to IDs
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name");

    const categoryMap = new Map(
      categories?.map((c) => [c.name.toLowerCase(), c.id]) || [],
    );

    // 9. Map transactions to database schema and filter duplicates
    const dbTransactions = transactions.map((t) => {
      const categoryId =
        categoryMap.get(t.category.toLowerCase()) || categoryMap.get("other");

      return {
        account_id: accountId,
        date: t.date,
        description: t.description,
        amount: t.amount,
        category_id: categoryId,
      };
    });

    // Helper to check date proximity (+/- 3 days)
    const isDateClose = (date1: string, date2: string): boolean => {
      const d1 = new Date(date1).getTime();
      const d2 = new Date(date2).getTime();
      const diffTime = Math.abs(d2 - d1);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 3;
    };

    // Filter out duplicates and update existing recurring transactions if matched
    const newTransactions: any[] = [];

    for (const newTx of dbTransactions) {
      // Find potential match
      const match = existingTransactions?.find(
        (existingTx) =>
          Math.abs(parseFloat(existingTx.amount) - newTx.amount) < 0.01 && // Same amount
          isDateClose(existingTx.date, newTx.date), // Similar date
      );

      if (match) {
        // If matched, we skip insertion (it's a duplicate or the recurring tx already exists)
        // Optionally we could update the description if it was a recurring placeholder
      } else {
        newTransactions.push(newTx);
      }
    }

    const duplicateCount = dbTransactions.length - newTransactions.length;

    // 10. Insert only new transactions
    if (newTransactions.length > 0) {
      const { error: insertError } = await supabase
        .from("transactions")
        .insert(newTransactions);

      if (insertError) {
        console.error("Database insert error:", insertError);
        return NextResponse.json(
          { error: "Failed to save transactions" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      total: transactions.length,
      new: newTransactions.length,
      duplicates: duplicateCount,
    });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
