function toCsvValue(value) {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToCsv(filename, columns, rows) {
  const header = columns.map((col) => toCsvValue(col.label)).join(",");

  const lines = rows.map((row) =>
    columns.map((col) => toCsvValue(col.value(row))).join(",")
  );

  downloadCsv(filename, [header, ...lines].join("\n"));
}

// Multiple labeled tables in one CSV file, e.g. a full report export
// combining several breakdowns. sections: [{ title, columns, rows }]
export function exportSectionsToCsv(filename, sections) {
  const blocks = sections.map((section) => {
    const header = section.columns.map((col) => toCsvValue(col.label)).join(",");
    const lines = section.rows.map((row) =>
      section.columns.map((col) => toCsvValue(col.value(row))).join(",")
    );
    const titleLine = section.title ? toCsvValue(section.title) : null;
    return [titleLine, header, ...lines].filter(Boolean).join("\n");
  });

  downloadCsv(filename, blocks.join("\n\n"));
}
