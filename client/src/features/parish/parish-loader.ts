import type { LoaderFunctionArgs } from "react-router-dom";
import { getParishBySlug } from "@/features/parish/parishApi";
import type { Parish } from "@/types";

export interface ParishLoaderData {
  parish: Parish;
}

export async function parishLayoutLoader({ params }: LoaderFunctionArgs) {
  const slug = params.parishSlug;
  if (!slug) {
    throw new Response("Not Found", { status: 404 });
  }

  const parish = getParishBySlug(slug);
  if (!parish) {
    throw new Response("Not Found", { status: 404 });
  }

  return { parish } satisfies ParishLoaderData;
}