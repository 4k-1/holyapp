const ONES = [
  "",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const SCALES = ["", "thousand", "million", "billion"];

function belowThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(`${ONES[hundreds]} hundred`);
  if (rest >= 20) parts.push(TENS[Math.floor(rest / 10)] + (rest % 10 ? `-${ONES[rest % 10]}` : ""));
  else if (rest) parts.push(ONES[rest]);
  return parts.join(" ");
}

function wholeInWords(n: number): string {
  if (n === 0) return "zero";
  const groups: string[] = [];
  let scale = 0;
  while (n > 0 && scale < SCALES.length) {
    const chunk = n % 1000;
    if (chunk) groups.unshift(`${belowThousand(chunk)}${SCALES[scale] ? ` ${SCALES[scale]}` : ""}`);
    n = Math.floor(n / 1000);
    scale += 1;
  }
  return groups.join(" ");
}

/** 1250.5 → "One thousand two hundred fifty pesos and 50/100", as written on Philippine receipts. */
export function amountInWords(amount: number): string {
  const cents = Math.round(amount * 100);
  const pesos = Math.floor(cents / 100);
  const centavos = cents % 100;
  const words = `${wholeInWords(pesos)} ${pesos === 1 ? "peso" : "pesos"}`;
  const text = centavos ? `${words} and ${String(centavos).padStart(2, "0")}/100` : `${words} only`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
