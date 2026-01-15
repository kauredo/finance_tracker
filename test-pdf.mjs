import fs from "fs";
import pdf from "pdf-parse";

const dataBuffer = fs.readFileSync("./src/app/api/parse-statement/saldo.pdf");

pdf(dataBuffer)
  .then(function (data) {
  })
  .catch((err) => {
    console.error("Error:", err.message);
  });
