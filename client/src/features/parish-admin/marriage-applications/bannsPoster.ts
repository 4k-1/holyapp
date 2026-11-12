// 5b: the banns poster as an image — downloaded for the parish Facebook page, shared from a phone, or printed
// for the bulletin board. The poster is drawn at full size (1080 × 1350, Facebook's portrait size) and shown
// scaled down on screen; the copy html2canvas draws from is put back to full size first.
import { printDocument } from "@/lib/printDocument";

export const POSTER_WIDTH = 1080;
export const POSTER_HEIGHT = 1350;
/** Palatino for the text: built into Windows and Mac, with close look-alikes after it. */
export const POSTER_FONT = '"Palatino Linotype", Palatino, "Book Antiqua", "URW Palladio L", Georgia, serif';
/** Classical inscriptional capitals for the parish name, the title and the couple's names. */
export const POSTER_HEADING_FONT = '"Cinzel", "Trajan Pro", Georgia, serif';

const FONT_CSS =
  "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&display=swap";

/** Loads the poster's heading typeface once, and waits until it can be drawn. */
export async function loadPosterFont() {
  if (!document.querySelector(`link[href="${FONT_CSS}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_CSS;
    document.head.appendChild(link);
    await new Promise((resolve) => {
      link.onload = resolve;
      link.onerror = resolve;
    });
  }
  await Promise.all(
    ["400 40px", "500 40px", "600 40px", "700 40px"].map((f) =>
      document.fonts.load(`${f} "Cinzel"`).catch(() => [])
    )
  );
}

async function drawPoster(node: HTMLElement): Promise<HTMLCanvasElement> {
  const [{ default: html2canvas }] = await Promise.all([import("html2canvas"), loadPosterFont()]);
  // In html2canvas's copy of the page, take the poster out of its scaled-down frame and pin it to the top
  // left at full size, then draw exactly that square.
  return html2canvas(node, {
    scale: 1,
    x: 0,
    y: 0,
    scrollX: 0,
    scrollY: 0,
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    windowWidth: POSTER_WIDTH,
    windowHeight: POSTER_HEIGHT,
    backgroundColor: "#ffffff",
    logging: false,
    useCORS: true,
    onclone: (doc, clone) => {
      const frame = doc.querySelector<HTMLElement>("[data-poster-frame]");
      if (frame) frame.style.transform = "none";
      Object.assign(clone.style, { position: "fixed", left: "0", top: "0", zIndex: "2147483647", margin: "0" });
    },
  });
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't make the image."))), "image/png")
  );
}

export async function downloadPoster(node: HTMLElement, filename: string) {
  const blob = await toBlob(await drawPoster(node));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Phones can hand the image straight to Facebook or Messenger; computers download it instead. */
export function canSharePoster() {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  const probe = new File([new Blob()], "banns.png", { type: "image/png" });
  return navigator.canShare({ files: [probe] });
}

export async function sharePoster(node: HTMLElement, filename: string, title: string) {
  const blob = await toBlob(await drawPoster(node));
  const file = new File([blob], filename, { type: "image/png" });
  try {
    await navigator.share({ files: [file], title });
  } catch (err) {
    // Closing the share sheet is not an error.
    if (err instanceof DOMException && err.name === "AbortError") return;
    throw err;
  }
}

/** The same poster on A4, for the bulletin board. */
export async function printPoster(node: HTMLElement, title: string) {
  const canvas = await drawPoster(node);
  printDocument(
    title,
    `<img src="${canvas.toDataURL("image/png")}" alt="" style="display:block;width:100%;max-width:170mm;margin:0 auto;" />`
  );
}
