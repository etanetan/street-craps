// All chip amounts are stored as integer cents.
// Display format: "$100" for 10000 cents (i.e. divide by 100 and show no decimals for round numbers)
export function formatChips(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  const formatted = dollars % 1 === 0 ? dollars.toFixed(0) : dollars.toFixed(2);
  return cents < 0 ? `-$${formatted}` : `$${formatted}`;
}

export function centsFromDollars(dollars: number): number {
  return Math.round(dollars * 100);
}

export function dollarsFromCents(cents: number): number {
  return cents / 100;
}

export function betLabel(type: string, number?: number): string {
  switch (type) {
    case 'PASS_LINE': return 'Pass Line';
    case 'DONT_PASS': return "Don't Pass";
    case 'PLACE': return `Place ${number}`;
    case 'LAY_PLACE': return `Lay ${number}`;
    default: return type;
  }
}

export function payoutLabel(type: string, number?: number): string {
  switch (type) {
    case 'PASS_LINE':
    case 'DONT_PASS': return '1:1';
    case 'PLACE':
      if (number === 4 || number === 10) return '2:1';
      if (number === 5 || number === 9) return '3:2';
      if (number === 6 || number === 8) return '6:5';
      return 'True Odds';
    case 'LAY_PLACE':
      if (number === 4 || number === 10) return '1:2';
      if (number === 5 || number === 9) return '2:3';
      if (number === 6 || number === 8) return '5:6';
      return 'Lay Odds';
    default: return '';
  }
}
