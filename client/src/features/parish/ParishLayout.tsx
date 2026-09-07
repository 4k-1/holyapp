import { Outlet, useLoaderData } from "react-router-dom";
import type { ParishLoaderData } from "@/features/parish/parish-loader";

export function ParishLayout() {
  const { parish } = useLoaderData() as ParishLoaderData;

  return <Outlet context={{ parish }} />;
}