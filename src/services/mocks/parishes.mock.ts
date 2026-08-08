import type { Parish } from "@/types";
import mtcarmelllogo from "@/assets/mtcarmellogo.png";

export const MOCK_PARISHES: Parish[] = [
  {
    id: "parish-1",
    slug: "mtcarmel",
    name: "Santuario Arquidiocesano de Nuestra Señora del Carmen, la Limpia",
    address: "Cebu City, Cebu",
    sealUrl: mtcarmelllogo,
    // backgroundImageUrl: "/mock-assets/immaculada-bg.jpg",
    tagline: "Where faith meets history",
  },
  {
    id: "parish-2",
    slug: "san-nicolas",
    name: "San Nicolas de Tolentino Parish",
    address: "Cebu City, Cebu",
    // no sealUrl / backgroundImageUrl / tagline — tests the fallback path
  },
];