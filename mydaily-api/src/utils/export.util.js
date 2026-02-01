// src/utils/export.util.js
const { Parser } = require("json2csv");
const ExcelJS = require("exceljs");

function sanitizeFilename(name) {
  return String(name || "export")
    .normalize("NFKD")                 // tách dấu unicode
    .replace(/[\u0300-\u036f]/g, "")   // bỏ dấu
    .replace(/[^\w\-\.]+/g, "_")       // ký tự không an toàn → _
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function sendCsv(res, rows, fields, filenameBase) {
  try {
    const parser = new Parser({ fields });
    const csv = parser.parse(rows || []);

    const filename = sanitizeFilename(`${filenameBase}.csv`);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-store");

    // BOM để Excel mở tiếng Việt không lỗi font
    res.send("\uFEFF" + csv);
  } catch (err) {
    console.error("sendCsv error:", err);
    res.status(500).json({
      error: "CSV_EXPORT_FAILED",
      message: err.message || "Failed to export CSV",
    });
  }
}

async function sendXlsx(res, rows, columns, filenameBase, sheetName = "Export") {
  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = "MyDaily";
    wb.created = new Date();

    const ws = wb.addWorksheet(sheetName);

    // columns: [{ header, key, width }]
    ws.columns = columns;
    ws.addRows(rows || []);

    // Header style
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: "middle" };
    headerRow.eachCell((cell) => {
      cell.border = {
        bottom: { style: "thin" },
      };
    });

    // Freeze header
    ws.views = [{ state: "frozen", ySplit: 1 }];

    const filename = sanitizeFilename(`${filenameBase}.xlsx`);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-store");

    const buffer = await wb.xlsx.writeBuffer();
    return res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("sendXlsx error:", err);
    res.status(500).json({
      error: "XLSX_EXPORT_FAILED",
      message: err.message || "Failed to export XLSX",
    });
  }
}

module.exports = { sendCsv, sendXlsx };
