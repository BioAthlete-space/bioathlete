const xlsx = require('xlsx');
const path = require('path');

const filePath = "G:\\Mon Drive\\Flow.pro\\BioAthlete\\Table Ciqual 2025_FR_2025_11_03.xlsx";
const workbook = xlsx.readFile(filePath);

const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Convert to JSON (just get the first 3 rows)
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log("Headers:");
console.log(data[0]);
console.log("\nRow 1:");
console.log(data[1]);
console.log("\nRow 2:");
console.log(data[2]);
