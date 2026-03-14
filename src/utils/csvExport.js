/**
 * Export an array of objects as a CSV file with automatic download.
 * @param {Object[]} data - Array of objects to export
 * @param {string} filename - Name of the downloaded file (without .csv)
 * @param {Object} [columnMap] - Optional mapping of { key: 'Display Name' }. If not provided, uses object keys.
 */
export function exportToCSV(data, filename, columnMap) {
  if (!data || data.length === 0) {
    alert('No data to export.');
    return;
  }

  const keys = columnMap ? Object.keys(columnMap) : Object.keys(data[0]);
  const headers = columnMap ? Object.values(columnMap) : keys;

  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      keys.map(key => {
        let val = row[key];
        // Handle nested objects (e.g., products.name)
        if (val && typeof val === 'object') val = JSON.stringify(val);
        // Wrap strings with commas/quotes in double quotes
        if (typeof val === 'string') val = `"${val.replace(/"/g, '""')}"`;
        return val ?? '';
      }).join(',')
    )
  ];

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
