"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { extractText } from "unpdf";

/**
 * Extract text from a PDF stored in Convex storage.
 * Runs in Node.js runtime to use unpdf (requires structuredClone with transfer).
 */
export const extractPdfText = internalAction({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args): Promise<string> => {
    const fileUrl = await ctx.storage.getUrl(args.storageId);
    if (!fileUrl) throw new Error("File not found in storage");

    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error("Failed to fetch file from storage");

    const arrayBuffer = await response.arrayBuffer();
    const result = await extractText(new Uint8Array(arrayBuffer), {
      mergePages: true,
    });
    return (result.text as string).trim();
  },
});
