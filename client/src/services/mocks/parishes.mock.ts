import type { Parish } from "@/types";
import mtcarmelllogo from "@/assets/mtcarmellogo.png";

export const MOCK_PARISHES: Parish[] = [
  {
    id: "parish-1",
    slug: "mtcarmel",
    name: "Santuario Arquidiocesano de Nuestra Señora del Carmen, la Limpia",
    address: "Cebu City, Cebu",
    contact: "(032) 254 1234",
    email: "office@mtcarmel-cebu.ph",
    sealUrl: mtcarmelllogo,
    tagline: "Where faith meets history",
    createdAt: "2026-01-05T08:00:00",
    updatedAt: "2026-06-20T10:00:00",
  },
  {
    id: "parish-2",
    slug: "san-nicolas",
    name: "San Nicolas de Tolentino Parish",
    address: "Cebu City, Cebu",
    contact: "(032) 261 5580",
    email: "office@sannicolas-cebu.ph",
    createdAt: "2026-03-12T09:00:00",
    updatedAt: "2026-03-12T09:00:00",
  },
];
