import { ApiError, apiFetch, apiFetchBlob } from "@/lib/api";

/** A supporting photo on a certificate request. The photo itself is fetched separately, with the user's sign-in. */
export interface RequestDocument {
  id: string;
  name: string;
  size: number;
  width: number;
  height: number;
  createdAt: string;
}

export const MAX_DOCUMENTS = 5;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
/** Phones' HEIC photos are turned into JPEGs by the browser when the picker asks for these. */
export const DOCUMENT_ACCEPT = "image/jpeg,image/png,image/webp";

/** Why a chosen file can't be attached, or null when it can. */
export function documentProblem(file: File): string | null {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return `${file.name} isn't a JPG or PNG photo.`;
  if (file.size > MAX_DOCUMENT_BYTES) return `${file.name} is over 10 MB. Choose a smaller photo.`;
  return null;
}

const base = (requestId: string) => `/requests/${encodeURIComponent(requestId)}/documents`;

export async function listRequestDocuments(requestId: string): Promise<{ documents: RequestDocument[]; canChange: boolean }> {
  return apiFetch(base(requestId), { auth: true });
}

export async function uploadRequestDocument(requestId: string, file: File): Promise<RequestDocument> {
  try {
    const data = await apiFetch<{ document: RequestDocument }>(base(requestId), {
      method: "POST",
      auth: true,
      rawBody: file,
      headers: { "Content-Type": file.type || "image/jpeg", "X-File-Name": encodeURIComponent(file.name) },
    });
    return data.document;
  } catch (err) {
    if (err instanceof ApiError && err.status === 413) {
      throw new Error(`${file.name} is over 10 MB. Choose a smaller photo.`, { cause: err });
    }
    throw err;
  }
}

export function getRequestDocumentImage(requestId: string, documentId: string): Promise<Blob> {
  return apiFetchBlob(`${base(requestId)}/${encodeURIComponent(documentId)}`, { auth: true });
}

export async function removeRequestDocument(requestId: string, documentId: string): Promise<void> {
  await apiFetch(`${base(requestId)}/${encodeURIComponent(documentId)}`, { method: "DELETE", auth: true });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
