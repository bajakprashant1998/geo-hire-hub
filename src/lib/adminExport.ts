export function exportToCSV(data: Record<string, unknown>[], filename: string, fields?: { key: string; label: string }[]) {
  if (!data.length) return;

  const keys = fields ? fields.map(f => f.key) : Object.keys(data[0]);
  const headers = fields ? fields.map(f => f.label) : keys;

  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      keys.map(key => {
        const val = row[key];
        const str = val === null || val === undefined ? '' : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(',')
    ),
  ];

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToJSON(data: Record<string, unknown>[], filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
