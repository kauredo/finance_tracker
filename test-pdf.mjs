import fs from "fs";
import pdf from "pdf-parse";

const dataBuffer = fs.readFileSync("./src/app/api/parse-statement/saldo.pdf");

pdf(dataBuffer)
  .then(function (data) {
    console.log("=== TEXT EXTRACTION RESULT ===");
    console.log("Pages:", data.numpages);
    console.log("\n=== EXTRACTED TEXT ===");
    console.log(data.text);
  })
  .catch((err) => {
    console.error("Error:", err.message);
  });
