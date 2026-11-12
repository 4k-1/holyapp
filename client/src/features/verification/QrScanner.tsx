import { useEffect, useRef, useState } from "react";
import { verificationCode } from "@/features/verification/verificationCode";

/** How often a camera frame is checked for a QR code, in ms. */
const SCAN_EVERY = 150;
/** Frames are shrunk to this width before decoding; plenty for a QR code and quick on phones. */
const SCAN_WIDTH = 640;

/** Browsers only offer the camera on https or localhost. */
function canUseCamera() {
  return typeof navigator.mediaDevices?.getUserMedia === "function";
}

function cameraError(err: unknown) {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera access is blocked. Allow the camera for this site in your browser settings, or paste the link instead.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No camera was found on this device. Paste the link instead.";
  if (name === "NotReadableError") return "The camera is in use by another app. Close it and try again.";
  return "The camera couldn't start. Paste the link instead.";
}

/**
 * Live camera view that reads a certificate's QR code and hands back its verification code.
 * The camera is switched off when a code is found or the scanner is closed.
 */
export function QrScanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(() =>
    canUseCamera() ? null : "This browser can't use the camera here. Paste the link instead."
  );
  const [ready, setReady] = useState(false);
  const [wrongCode, setWrongCode] = useState(false);
  const onCodeRef = useRef(onCode);
  useEffect(() => {
    onCodeRef.current = onCode;
  }, [onCode]);

  useEffect(() => {
    if (!canUseCamera()) return;
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let stopped = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    function stop() {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    }

    async function start() {
      try {
        const { default: jsQR } = await import("jsqr");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (stopped) return stop();
        const video = videoRef.current;
        if (!video) return stop();
        video.srcObject = stream;
        await video.play();
        setReady(true);

        const scan = () => {
          if (stopped) return;
          if (ctx && video.videoWidth) {
            const scale = Math.min(1, SCAN_WIDTH / video.videoWidth);
            canvas.width = Math.round(video.videoWidth * scale);
            canvas.height = Math.round(video.videoHeight * scale);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const found = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "dontInvert" });
            if (found?.data) {
              const code = verificationCode(found.data);
              if (code) {
                stop();
                onCodeRef.current(code);
                return;
              }
              setWrongCode(true);
            }
          }
          timer = window.setTimeout(scan, SCAN_EVERY);
        };
        scan();
      } catch (err) {
        if (!stopped) setError(cameraError(err));
        stop();
      }
    }

    start();
    return stop;
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-surface-alt px-4 py-4">
        <p role="alert" className="text-sm leading-relaxed text-ink">
          {error}
        </p>
        <button type="button" onClick={onClose} className="mt-3 text-sm font-semibold text-primary hover:underline">
          Close
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="relative mx-auto aspect-square w-full max-w-[360px] overflow-hidden rounded-2xl bg-ink">
        <video ref={videoRef} muted playsInline className="h-full w-full object-cover" aria-label="Camera view" />
        {/* The square to line the code up in. */}
        <div className="pointer-events-none absolute inset-[18%] rounded-xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        {!ready && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-white/85">Starting the camera…</p>
        )}
      </div>
      <p className="mt-3 text-center text-sm leading-relaxed text-ink-muted" aria-live="polite">
        {wrongCode
          ? "That QR code isn't from a HolyApp certificate. Point at the code in the certificate's corner."
          : "Point the camera at the QR code in the certificate's corner. It checks by itself."}
      </p>
      <div className="mt-3 text-center">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-ink-muted hover:bg-surface-alt hover:text-ink"
        >
          Stop scanning
        </button>
      </div>
    </div>
  );
}
