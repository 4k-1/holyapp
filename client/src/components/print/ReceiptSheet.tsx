import { amountInWords } from "./amountInWords";
import { PrintSheet } from "./PrintSheet";
import "./receipt.css";

export interface ReceiptData {
  /** e.g. "Acknowledgment Receipt" for gifts, "Payment Receipt" for fees. */
  title: string;
  number: string;
  /** ISO date or timestamp. */
  date: string;
  receivedFrom: string;
  amount: number;
  /** What the money was for, e.g. "Donation — General fund". */
  forText: string;
  method?: string;
  receivedBy?: string;
  /** Extra line under "For", e.g. the certificate subject. */
  note?: string;
}

interface ParishHeader {
  name: string;
  address?: string;
  contact?: string;
}

function longDate(value: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function peso(amount: number) {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Two copies on one page, one for the person who paid and one for the parish, with a cut line between. */
export function ReceiptSheet({ parish, receipt }: { parish: ParishHeader; receipt: ReceiptData }) {
  return (
    <PrintSheet className="receipt-sheet">
      {["Copy for the giver", "Parish copy"].map((copy) => (
        <section key={copy} className="receipt-sheet__copy">
          <header className="receipt-sheet__head">
            <div>
              <p className="receipt-sheet__parish">{parish.name}</p>
              {(parish.address || parish.contact) && (
                <p className="receipt-sheet__contact">{[parish.address, parish.contact].filter(Boolean).join(" · ")}</p>
              )}
            </div>
            <div className="receipt-sheet__number">
              <p>No. {receipt.number}</p>
              <p>{longDate(receipt.date)}</p>
            </div>
          </header>

          <h1 className="receipt-sheet__title">{receipt.title}</h1>

          <dl className="receipt-sheet__fields">
            <div>
              <dt>Received from</dt>
              <dd>{receipt.receivedFrom || " "}</dd>
            </div>
            <div>
              <dt>The sum of</dt>
              <dd>
                {amountInWords(receipt.amount)} <strong>({peso(receipt.amount)})</strong>
              </dd>
            </div>
            <div>
              <dt>For</dt>
              <dd>
                {receipt.forText}
                {receipt.note && <span className="receipt-sheet__note">{receipt.note}</span>}
              </dd>
            </div>
            {receipt.method && (
              <div>
                <dt>Paid by</dt>
                <dd>{receipt.method}</dd>
              </div>
            )}
          </dl>

          <footer className="receipt-sheet__foot">
            <p className="receipt-sheet__thanks">Thank you. God bless you.</p>
            <div className="receipt-sheet__sign">
              <span>{receipt.receivedBy || " "}</span>
              <span>Received by</span>
            </div>
          </footer>
          <p className="receipt-sheet__copy-label">{copy}</p>
        </section>
      ))}
    </PrintSheet>
  );
}
