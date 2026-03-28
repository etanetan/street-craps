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
    case 'PASS_ODDS': return 'Pass Odds';
    case 'DONT_ODDS': return "Don't Pass Odds";
    case 'PLACE': return `Place ${number}`;
    case 'HARDWAY': return `Hard ${number}`;
    case 'ANY_CRAPS': return 'Any Craps';
    case 'ANY_SEVEN': return 'Any 7';
    case 'HIGH_LOW': return number === 1 ? 'High (8-12)' : 'Low (2-6)';
    default: return type;
  }
}

export function payoutLabel(type: string, number?: number): string {
  switch (type) {
    case 'PASS_LINE':
    case 'DONT_PASS': return '1:1';
    case 'PASS_ODDS':
      if (number === 4 || number === 10) return '2:1';
      if (number === 5 || number === 9) return '3:2';
      if (number === 6 || number === 8) return '6:5';
      return 'True Odds';
    case 'DONT_ODDS':
      if (number === 4 || number === 10) return '1:2';
      if (number === 5 || number === 9) return '2:3';
      if (number === 6 || number === 8) return '5:6';
      return 'True Odds';
    case 'PLACE':
      if (number === 4 || number === 10) return '9:5';
      if (number === 5 || number === 9) return '7:5';
      if (number === 6 || number === 8) return '7:6';
      return 'True Odds';
    case 'HARDWAY':
      if (number === 4 || number === 10) return '7:1';
      if (number === 6 || number === 8) return '9:1';
      return '7:1';
    case 'ANY_CRAPS': return '7:1';
    case 'ANY_SEVEN': return '4:1';
    case 'HIGH_LOW': return '1:1';
    default: return '';
  }
}
