import { readFile } from "node:fs/promises";
import path from "node:path";

import { McpServer } from "skybridge/server";
import Fuse from "fuse.js";
import * as z from "zod";
import { type TourDetail, type TourSummary } from "../../web/types/Tour.js";

type ServerTourDetail = TourDetail & {
  slug: string;
  summary: string;
};

type BundledTourCollection = {
  data: {
    items: Array<{
      id: string;
      title: string;
      city?: string | null;
      coordinates?: string[];
      geohash?: string;
    }>;
  };
};

type TourDetailFile = {
  data?: TourDetail;
};

const ASSET_ROOT = path.resolve(process.cwd(), "assets");
const ALL_TOURS_PATH = path.join(ASSET_ROOT, "all.json");
const TOUR_DIRECTORY_PATH = path.join(ASSET_ROOT, "tour");

function getTourSlug(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/ /g, "-");
}

function stripHtml(value?: string) {
  if (!value) {
    return "";
  }

  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function loadAllTours() {
  const file = await readFile(ALL_TOURS_PATH, "utf8");
  const parsed = JSON.parse(file) as BundledTourCollection;

  return parsed.data.items.reduce<TourSummary[]>((result, item) => {
    if (!item.coordinates || item.coordinates.length < 2) {
      return result;
    }

    const longitude = Number(item.coordinates[0]);
    const latitude = Number(item.coordinates[1]);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      return result;
    }

    result.push({
      id: item.id,
      title: item.title,
      city: item.city ?? undefined,
      slug: getTourSlug(item.title),
      coordinates: [longitude, latitude],
      geohash: item.geohash,
    });

    return result;
  }, []);
}

async function loadTourDetail(summary: TourSummary) {
  const filePath = path.join(TOUR_DIRECTORY_PATH, `${summary.id}.json`);
  const file = await readFile(filePath, "utf8");
  const parsed = JSON.parse(file) as TourDetailFile;
  const data = parsed.data;

  if (!data) {
    throw new Error(`No detail data found for tour "${summary.title}"`);
  }

  return {
    ...data,
    slug: summary.slug,
    summary: stripHtml(data.text),
  } satisfies ServerTourDetail;
}

async function getTourByName(name: string) {
  const tours = await loadAllTours();

  const fuse = new Fuse(tours, {
    keys: ["title", "city"],
    includeScore: true,
  });

  const results = fuse.search(name);

  if (results.length === 0) {
    throw new Error(`No hiking tour found matching "${name}"`);
  }

  const bestMatch = results[0].item;

  const detailPromise = loadTourDetail(bestMatch);
  return detailPromise;
}

async function getTourById(id: string) {
  const tours = await loadAllTours();
  const matchingTour = tours.find((tour) => tour.id === id);

  if (!matchingTour) {
    throw new Error(`No hiking tour found with id "${id}"`);
  }

  return loadTourDetail(matchingTour);
}

function formatTourForModel(tour: ServerTourDetail) {
  const lines = [tour.title];

  if (tour.city) {
    lines.push(`City: ${tour.city}`);
  }
  if (tour.categories.length > 0) {
    lines.push(`Categories: ${tour.categories.join(", ")}`);
  }
  if (tour.url) {
    lines.push(`URL: ${tour.url}`);
  }
  if (tour.summary) {
    lines.push(`Summary: ${tour.summary}`);
  }

  return lines.join("\n");
}

function formatMapOpenedMessage(query?: string) {
  if (!query) {
    return "Opened the hiking map of Austria. You can browse routes by area and select a tour on the map.";
  }

  return `Opened the hiking map and focused on routes matching "${query}".`;
}

const server = new McpServer(
  {
    name: "austrian-hiking-map",
    version: "0.1.0",
  },
  { capabilities: {} },
).registerTool(
  {
    name: "hiking-tour-map",
    description:
      "Use this tool to explore hiking tours in Austria. It displays an interactive terrain map and detailed route information. Always use it when users ask about hiking tours, trails, or outdoor activities in Austria.",
    inputSchema: {
      id: z
        .string()
        .optional()
        .describe(
          "Exact tour id. Use this when the hiking map reports a frontend selection.",
        ),
      name: z
        .string()
        .optional()
        .describe(
          "Optional hiking tour or area query, such as a route title or place name like 'Hinterstoder', 'Stoder', or 'Dachstein'. Leave empty to open the general hiking map.",
        ),
    },
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    },
    view: {
      component: "hiking-tour-map",
      description:
        "Interactive hiking tour map of Austria with detailed tour information.",
      prefersBorder: true,
      hosts: ["apps-sdk"],
      csp: {
        connectDomains: [
          "https://api.mapbox.com",
          "https://events.mapbox.com",
        ],
        resourceDomains: ["https://api.mapbox.com"],
      },
    },
    _meta: {
      "openai/widgetAccessible": true,
      "openai/toolInvocation/invoking": "Finding Austrian hikes…",
      "openai/toolInvocation/invoked": "Hiking map ready",
    },
  },
  async ({ id, name }) => {
    try {
      const allTours = await loadAllTours();

      if (!id && !name) {
        return {
          _meta: {
            allTours,
          },
          structuredContent: {},
          content: [
            {
              type: "text",
              text: formatMapOpenedMessage(),
            },
          ],
          isError: false,
        };
      }

      const tour = id ? await getTourById(id) : await getTourByName(name!);

      return {
        _meta: {
          slug: tour.slug,
          allTours, // In meta to avoid flooding the model
        },
        structuredContent: {
          tour, // Initial tour details
        },
        content: [
          {
            type: "text",
              text: `${formatMapOpenedMessage(tour.title)}\n\n${formatTourForModel(tour)}`,
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.run();

export type AppType = typeof server;
