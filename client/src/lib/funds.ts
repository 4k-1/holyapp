/**
 * The funds a gift can go to (D3). Mirrors server/src/constants/funds.js; a server test checks the two match.
 * Anything not listed is typed in under "Other".
 * `mustRemit`: the parish passes every peso on to the diocese or the Holy See.
 */
export interface Fund {
  name: string;
  description: string;
  mustRemit?: boolean;
}

export const FUNDS: readonly Fund[] = [
  { name: "General fund", description: "Where the parish needs it most" },
  { name: "Church repair and maintenance", description: "Upkeep of the church and grounds" },
  { name: "Outreach and charity", description: "Help for families in need" },
  { name: "Feast day celebration", description: "The parish fiesta and liturgies" },
  { name: "Feeding program", description: "Meals for children and families" },
  { name: "Seminarians", description: "Support for young men studying for the priesthood" },
  { name: "Peter's Pence", description: "The Holy Father's works of charity", mustRemit: true },
  { name: "Alay Kapwa", description: "The Lenten program for the poor", mustRemit: true },
  { name: "Mission Sunday", description: "The missions of the Church", mustRemit: true },
  { name: "Holy Land", description: "The Good Friday collection for the Holy Land", mustRemit: true },
];

/** Lower case, letters and digits only, the same as the server's key. */
export function fundKey(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function findFund(text: string | undefined | null): Fund | undefined {
  if (!text) return undefined;
  const key = fundKey(text);
  return FUNDS.find((fund) => fundKey(fund.name) === key);
}
