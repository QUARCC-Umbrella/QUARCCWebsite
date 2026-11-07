import { defineCollection, z } from "astro:content";

const titleLines = z.array(z.string());
const headed = z.object({ title: titleLines, sub: z.string().default("") });
const labelledCard = z.object({
  label: z.string(),
  title: z.string(),
  body: z.string(),
  href: z.string().optional(),
  cta: z.string().optional(),
});

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
      // Small mono label above the title, e.g. "Research", "Paper fund".
      category: z.string().default("Research"),
      // Short slug-like name shown on the card thumbnail, e.g. "factor-risk-qp".
      label: z.string().optional(),
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
    // One-line version for the events list; falls back to the first paragraph of `description`.
    summary: z.string().optional(),
    category: z.string().default("Event"),
    partner: z.string().optional(),
    location: z.string(),
    locationLink: z.string().optional(),
    room: z.string().optional(),
    venue: z.string().optional(),
    speaker: z
      .object({
        name: z.string(),
        org: z.string(),
        role: z.string(),
      })
      .optional(),
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
    asOf: z.string().optional(),
    liveSince: z.string().optional(),
    exposures: z.any().optional(),
    performance: z.any().optional(),
    factsheet: z.any().optional(),
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
    hero: headed,
    strategies: z.object({ title: z.string(), badge: z.string() }),
    map: headed,
    pillars: z.array(labelledCard),
    audience: z.object({ label: z.string(), text: z.string(), chips: z.array(z.string()) }),
    learn: headed.extend({
      steps: z.array(z.tuple([z.string(), z.string()])),
      resources: z.array(labelledCard),
    }),
    research: headed,
    compete: headed,
    people: headed,
  }),
});

const about = defineCollection({
  type: "data",
  schema: z.object({
    hero: headed,
    offer: headed.extend({ cards: z.array(labelledCard) }),
    clubDetails: z.array(z.tuple([z.string(), z.string()])),
    projectStatus: z.array(z.object({ label: z.string(), value: z.string(), live: z.boolean().default(false) })),
    halves: headed.extend({ cards: z.array(labelledCard) }),
    faqTitle: z.string(),
  }),
});

const join = defineCollection({
  type: "data",
  schema: z.object({
    hero: headed.extend({ chips: z.array(z.string()) }),
    paths: headed.extend({
      cards: z.array(
        labelledCard.extend({
          rows: z.array(z.tuple([z.string(), z.string()])),
          style: z.enum(["cream", "navy"]).default("cream"),
        }),
      ),
    }),
    steps: z.object({ title: titleLines, items: z.array(z.tuple([z.string(), z.string()])) }),
    contact: headed,
    quote: z.object({ label: z.string(), text: z.string(), chips: z.array(z.string()) }),
  }),
});

const faq = defineCollection({
  type: "data",
  schema: z.object({
    items: z.array(z.object({ q: z.string(), a: z.string() })),
  }),
});

const trophies = defineCollection({
  type: "data",
  schema: z.object({
    title: z.string(),
    competition: z.string(),
    placement: z.string(),
    // Display form of the placement, e.g. "Semi-finalist", "4th place".
    placementLabel: z.string().optional(),
    kind: z.string().default("Competition"),
    date: z.string(),
    summary: z.string(),
    detail: z.string(),
    emoji: z.string().default("🏆"),
    images: z.array(z.string()).default([]),
    link: z.string().optional(),
    team: z.array(z.string()).default([]),
    categories: z.array(z.string()).default([]),
    // The featured result gets the large card on /trophies and the home page.
    featured: z.boolean().default(false),
    headline: z.string().optional(),
    headlineLabel: z.string().optional(),
    highlights: z.array(z.object({ value: z.string(), label: z.string() })).default([]),
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
  faq,
  trophies,
};
