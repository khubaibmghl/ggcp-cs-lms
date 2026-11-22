/**
 * Format a date string or Date object into academic standard DD/MMM/YYYY (e.g. 25/Nov/2026).
 */
export function formatDateDDMMMYYYY(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  try {
    let d: Date;
    if (typeof dateInput === 'string') {
      const clean = dateInput.trim();
      // Handle simple YYYY-MM-DD to avoid timezone shifting
      if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
        const [y, m, day] = clean.split('-').map(Number);
        d = new Date(y, m - 1, day);
      } else {
        d = new Date(clean);
      }
    } else {
      d = new Date(dateInput);
    }

    if (isNaN(d.getTime())) return String(dateInput);

    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Format a date string or Date object into DD/MMM/YYYY at hh:mm AM/PM (e.g. 25/Nov/2026 at 11:59 PM).
 */
export function formatDateTimeDDMMMYYYY(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  try {
    const formattedDate = formatDateDDMMMYYYY(dateInput);
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return formattedDate;

    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${formattedDate} at ${time}`;
  } catch {
    return formatDateDDMMMYYYY(dateInput);
  }
}
