# Statement Processing

Wallet Joy supports importing bank statements to automatically extract and categorize transactions.

## Supported File Types

### 1. CSV / TSV Files
- **Extensions**: `.csv`, `.tsv`
- **Encoding**: Automatically detects and handles various encodings (UTF-8, ISO-8859-1, Windows-1252, etc.).
- **Processing**:
    1.  **Encoding Detection**: The system detects the file encoding using `jschardet`.
    2.  **Decoding**: The content is decoded to UTF-8 using `iconv-lite`.
    3.  **Parsing**: The CSV is parsed into a structured JSON object using `papaparse`. This handles quoted fields, delimiters, and headers correctly.
    4.  **AI Extraction**: The structured JSON is sent to OpenAI to identify the relevant columns (Date, Description, Amount) and normalize the data.

### 2. Images
- **Extensions**: `.png`, `.jpg`, `.jpeg`
- **Processing**:
    1.  **Vision API**: The images are sent to OpenAI's Vision API.
    2.  **Extraction**: The AI visually analyzes the statement to extract transactions, handling multi-column layouts (Debit/Credit) and multi-line descriptions.

## Best Practices for Uploads

- **CSV**: Ensure the file has headers. The system is flexible with header names as the AI interprets them.
- **Images**: Ensure the image is clear and legible. For multi-page statements, you can upload multiple images at once.
