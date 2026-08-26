import { makeLedgerScanDataUrl } from "@/features/parish-admin/ledgers/ledgerScanImage";
import type { LedgerBook, LedgerPage } from "@/features/parish-admin/ledgers/types";
import type { SacramentType } from "@/types";

function book(partial: LedgerBook): LedgerBook {
  return partial;
}

function pagesFor(
  parishId: string,
  bookId: string,
  sacrament: SacramentType,
  heading: string,
  volume: string,
  scannedAt: string,
  sheets: string[][]
): LedgerPage[] {
  return sheets.map((lines, i) => {
    const pageNumber = i + 1;
    return {
      id: `${bookId}-p${String(pageNumber).padStart(2, "0")}`,
      parishId,
      bookId,
      pageNumber,
      scannedAt,
      ocrText: lines.join(" · "),
      imageUrl: makeLedgerScanDataUrl({ heading, volume, pageNumber, lines }),
    };
  });
}

export const MOCK_LEDGER_BOOKS: LedgerBook[] = [
  book({
    id: "led-bap-06",
    parishId: "parish-1",
    sacramentType: "baptism",
    title: "Baptismal Register Book 6",
    volumeLabel: "Book 6",
    yearStart: 2004,
    yearEnd: 2006,
    pageCount: 6,
    status: "ready",
  }),
  book({
    id: "led-bap-03",
    parishId: "parish-1",
    sacramentType: "baptism",
    title: "Baptismal Register Book 3",
    volumeLabel: "Book 3",
    yearStart: 1995,
    yearEnd: 1998,
    pageCount: 4,
    status: "ready",
  }),
  book({
    id: "led-cfm-02",
    parishId: "parish-1",
    sacramentType: "confirmation",
    title: "Confirmation Register Book 2",
    volumeLabel: "Book 2",
    yearStart: 2018,
    yearEnd: 2022,
    pageCount: 4,
    status: "ready",
  }),
  book({
    id: "led-cfm-03",
    parishId: "parish-1",
    sacramentType: "confirmation",
    title: "Confirmation Register Book 3",
    volumeLabel: "Book 3",
    yearStart: 2025,
    yearEnd: 2026,
    pageCount: 0,
    status: "scanning",
  }),
  book({
    id: "led-mrg-01",
    parishId: "parish-1",
    sacramentType: "marriage",
    title: "Marriage Register Book 1",
    volumeLabel: "Book 1",
    yearStart: 2022,
    yearEnd: 2024,
    pageCount: 4,
    status: "ready",
  }),
  book({
    id: "led-dth-01",
    parishId: "parish-1",
    sacramentType: "death",
    title: "Death Register Book 1",
    volumeLabel: "Book 1",
    yearStart: 2024,
    yearEnd: 2026,
    pageCount: 3,
    status: "ready",
  }),
];

export const MOCK_LEDGER_PAGES: LedgerPage[] = [
  ...pagesFor("parish-1", "led-bap-06", "baptism", "Liber Baptizatorum", "Book 6", "2024-11-02", [
    ["L1  Santos, Maria Teresa  b. 12 Apr 1998  bapt. 26 Apr 1998", "Mother Ana Marie Santos  Father Roberto Santos", "Minister Rev. Fr. Juan Santos  Sponsors Paula Bracho, Miguel Cruz"],
    ["L8  Torres, Miguel Angel  b. 3 Aug 2009  bapt. 22 Aug 2009", "Mother Lourdes Torres  Father Paolo Torres", "Place Sto. Niño de Cebu Parish"],
    ["L12  Bautista, Carla Mae  b. 19 Jan 2004  bapt. 8 Feb 2004", "Mother Rosario Bautista  Father Emilio Bautista"],
    ["L14  Sayaang, Jenicha Niña  b. 18 Jan 2005  Alegria, Cebu", "bapt. 15 Feb 2005  Minister Rev. Fr. Juan Santos", "Mother Lolita Sayaang  Father Felix Sayaang  Entry 04"],
    ["L18  Cruz, Roberto  b. 2 Mar 1996  bapt. 30 Mar 1996", "Mother Elena Cruz  Father Antonio Cruz"],
    ["L21  Lopez, Ana Marie  b. 14 Jun 1997  bapt. 6 Jul 1997", "Mother Carmen Lopez  Father Jose Lopez"],
  ]),
  ...pagesFor("parish-1", "led-bap-03", "baptism", "Liber Baptizatorum", "Book 3", "2024-08-18", [
    ["L2  Reyes, Paolo  b. 11 May 1995  bapt. 4 Jun 1995", "Mother Isabel Reyes  Father Ramon Reyes"],
    ["L9  Lim, Stephanie  b. 28 Sep 1996  bapt. 20 Oct 1996", "Place Sto. Niño de Cebu Parish"],
    ["L15  Tan, Joshua Miguel  b. 7 Jan 1997  bapt. 2 Feb 1997", "Minister Rev. Fr. Emilio Santos"],
    ["L22  Garcia, Lourdes  b. 3 Dec 1997  bapt. 28 Dec 1997", "Mother Teresa Garcia  Father Andres Garcia"],
  ]),
  ...pagesFor("parish-1", "led-cfm-02", "confirmation", "Liber Confirmatorum", "Book 2", "2025-01-14", [
    ["L3  Torres, Miguel Angel  conf. 18 May 2024", "Minister Most Rev. Jose Palma, D.D.", "Sponsor Paula Bracho"],
    ["L8  Sayaang, Jenicha Niña  conf. 21 Jul 2021  Line 14", "Minister Most Rev. Jose Palma, D.D.", "Confirmed at Sto. Niño de Cebu Parish"],
    ["L11  Cruz, Roberto  conf. 12 May 2019", "Sponsor Juan Miguel Cruz"],
    ["L16  Lopez, Ana Marie  conf. 12 May 2019", "Sponsor Maria Teresa Santos"],
  ]),
  ...pagesFor("parish-1", "led-mrg-01", "marriage", "Liber Matrimoniorum", "Book 1", "2025-03-08", [
    ["L1  Santos, Maria Teresa & Cruz, Juan Miguel  14 Jun 2022", "Witnesses Paolo Torres, Lourdes Garcia", "Place Sto. Niño de Cebu Parish"],
    ["L4  Cruz, Roberto & Lopez, Ana Marie  18 May 2024  10:30", "Witnesses Miguel Torres, Carla Bautista", "Book 1 Page 04 Line 01"],
    ["L7  Reyes, Paolo & Lim, Stephanie  9 Nov 2023", "Place Sto. Niño de Cebu Parish"],
    ["L9  Tan, Joshua Miguel & Garcia, Lourdes  2 Feb 2024", "Minister Rev. Fr. Juan Santos"],
  ]),
  ...pagesFor("parish-1", "led-dth-01", "death", "Liber Defunctorum", "Book 1", "2026-03-12", [
    ["L2  Bautista, Rosario Elena  d. 2 Mar 2026  age 79", "Burial 5 Mar 2026  Carreta Cemetery", "Minister Rev. Fr. Juan Santos"],
    ["L3  Hawke, Ethan  d. 2 Mar 2026  age 26  Single", "Burial 5 Mar 2026  Carreta Cemetery  Niche B-142", "Cause cardiac arrest  Minister Rev. Fr. Juan Santos"],
    ["L8  Reyes, Ramon  d. 18 Jan 2025  age 81", "Burial 21 Jan 2025  Carreta Cemetery"],
  ]),
];
