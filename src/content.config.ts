import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: image().optional(),
      heroImageAlt: z.string().optional(),
      tags: z.array(z.string()).default([]),
      draft: z.boolean().default(false),
      featured: z.boolean().default(false),
    }),
});

const events = defineCollection({
  type: "data",
  schema: z.object({
    title: z.string(),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    description: z.string(),
    location: z.string(),
    locationLink: z.string().optional(),
    room: z.string().optional(),
    link: z.string().optional(),
    order: z.number().default(0),
  }),
});

const teams = defineCollection({
  type: "data",
  schema: z.object({
    name: z.string(),
    description: z.string(),
    leadLabel: z.string().optional(),
    order: z.number().default(0),
    members: z.array(
      z.object({
        name: z.string(),
        role: z.string(),
        bio: z.string().default(""),
        email: z.string().default(""),
        linkedin: z.string().default(""),
        website: z.string().default(""),
        image: z.string().default(""),
      }),
    ),
  }),
});

const portfolios = defineCollection({
  type: "data",
  schema: z.object({
    name: z.string(),
    strategy: z.string(),
    status: z.string(),
    summary: z.string(),
    featured: z.boolean().default(false),
    order: z.number().default(0),
    stats: z.object({
      equity: z.string(),
      dayChange: z.string(),
      sharpe: z.string(),
      beta: z.string(),
    }),
    holdings: z.array(
      z.object({
        symbol: z.string(),
        qty: z.number(),
        avgPrice: z.string(),
        currentPrice: z.string(),
        pl: z.string(),
      }),
    ),
    chartData: z.array(
      z.object({
        time: z.union([z.string(), z.number()]),
        value: z.number(),
      }),
    ),
  }),
});

const home = defineCollection({
  type: "data",
  schema: z.object({
    clubDetails: z.array(z.tuple([z.string(), z.string()])),
    projectStatus: z.array(z.tuple([z.string(), z.string()])),
    welcomeTitle: z.string(),
    welcomeBody: z.string(),
  }),
});

const about = defineCollection({
  type: "data",
  schema: z.object({
    paragraphs: z.array(z.string()),
  }),
});

const join = defineCollection({
  type: "data",
  schema: z.object({
    sections: z.array(
      z.object({
        title: z.string(),
        lines: z.array(z.string()),
      }),
    ),
  }),
});

const trophies = defineCollection({
  type: "data",
  schema: z.object({
    title: z.string(),
    competition: z.string(),
    placement: z.string(),
    date: z.string(),
    summary: z.string(),
    detail: z.string(),
    emoji: z.string().default("🏆"),
    images: z.array(z.string()).default([]),
    link: z.string().optional(),
    order: z.number().default(0),
  }),
});

export const collections = {
  blog,
  events,
  teams,
  portfolios,
  home,
  about,
  join,
  trophies,
};

