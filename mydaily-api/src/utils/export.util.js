// src/utils/export.util.js
const { Parser } = require("json2csv");
const ExcelJS = require("exceljs");

function sanitizeFilename(name) {
  return String(name).replace(/[^\w\-\.]+/g, "_");
}

function sendCsv(res, rows, fields, filenameBase) {
  const parser = new Parser({ fields });
  const csv = parser.parse(rows || []);

  const filename = sanitizeFilename(`${filenameBase}.csv`);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  // BOM để Excel mở CSV tiếng Việt không lỗi font
  res.send("\uFEFF" + csv);
}

async function sendXlsx(res, rows, columns, filenameBase, sheetName = "Export") {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);

  ws.columns = columns; // [{ header, key, width }]
  ws.addRows(rows || []);

  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const filename = sanitizeFilename(`${filenameBase}.xlsx`);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  await wb.xlsx.write(res);
  res.end();
}

module.exports = { sendCsv, sendXlsx };
