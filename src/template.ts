import * as XLSX from "xlsx";

const SAMPLE_DATA = [
  { Name: "Jane Smith", Email: "jane.smith@example.com" },
  { Name: "John Doe", Email: "john.doe@example.com" },
  { Name: "Alice Johnson", Email: "alice.j@example.com" },
  { Name: "Bob Williams", Email: "bob.w@example.com" },
  { Name: "Carol Davis", Email: "carol.d@example.com" },
];

export function downloadTemplate() {
  const ws = XLSX.utils.json_to_sheet(SAMPLE_DATA);
  ws["!cols"] = [{ wch: 25 }, { wch: 30 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Participants");
  XLSX.writeFile(wb, "prize-randomizer-template.xlsx");
}

export interface Participant {
  name: string;
  email: string;
}

export function parseSpreadsheet(data: ArrayBuffer): Participant[] {
  const wb = XLSX.read(data, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);

  if (rows.length === 0) {
    throw new Error("The spreadsheet is empty. Please add participant data.");
  }

  const nameCol = Object.keys(rows[0]).find((h) => h.toLowerCase().trim() === "name");

  if (!nameCol) {
    throw new Error(
      'Could not find a "Name" column. Please use the template format with Name and Email columns.'
    );
  }

  const emailCol = Object.keys(rows[0]).find((h) => h.toLowerCase().trim() === "email");

  return rows
    .map((row) => ({
      name: String(row[nameCol] || "").trim(),
      email: emailCol ? String(row[emailCol] || "").trim() : "",
    }))
    .filter((p) => p.name.length > 0);
}
