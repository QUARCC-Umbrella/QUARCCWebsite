// Site-wide constants: canonical origin, contact channels, navigation, and the
// Organization / WebSite JSON-LD shared by every page.

export const SITE_URL = "https://www.quarcc.com";
export const SITE_NAME = "QUARCC";
export const SITE_FULL_NAME = "Quantitative Research and Competitions Club";
export const DEFAULT_DESCRIPTION =
  "QUARCC is a student-run quantitative finance club in Montreal: speaker series, workshops, a research group running live paper funds, and trading competitions.";
export const DEFAULT_IMAGE = "/quarcc-logo-512.png";

export const CONTACT = {
  email: "info@quarcc.com",
  researchEmail: "research.quarcc@gmail.com",
  instagram: "https://www.instagram.com/quarcc.csu/",
  instagramHandle: "@quarcc.csu",
  linkedin: "https://www.linkedin.com/company/quarcc/",
  linkedinHandle: "/company/quarcc",
  discord: "https://discord.gg/9w7AZxP5",
  discordHandle: "discord.gg/9w7AZxP5",
  github: "https://github.com/QUARCC-Umbrella",
};

export const PARTNER_MAILTO = `mailto:${CONTACT.email}?subject=${encodeURIComponent("Partnering with QUARCC")}`;

export const NAV = [
  { href: "/about/", label: "About" },
  { href: "/events/", label: "Events" },
  { href: "/blog/", label: "Blog" },
  { href: "/teams/", label: "Teams" },
  { href: "/trophies/", label: "Trophies" },
  { href: "/paper-fund/", label: "Paper funds" },
];

export const FOOTER_EXPLORE = [...NAV, { href: "/faq/", label: "FAQ" }];

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

// The host 301s "/about" to "/about/", so every internal page URL ends in a slash.
export function pageUrl(path: string) {
  if (/\.[a-z0-9]+$/i.test(path) || path.includes("#") || path.includes("?")) return path;
  return path.endsWith("/") ? path : `${path}/`;
}

export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export const organizationSchema = {
  "@type": "Organization",
  "@id": ORG_ID,
  name: SITE_NAME,
  alternateName: SITE_FULL_NAME,
  url: `${SITE_URL}/`,
  logo: {
    "@type": "ImageObject",
    url: absoluteUrl(DEFAULT_IMAGE),
    width: 512,
    height: 512,
  },
  email: CONTACT.email,
  description: DEFAULT_DESCRIPTION,
  foundingLocation: { "@type": "Place", name: "Montreal, Quebec, Canada" },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Montreal",
    addressRegion: "QC",
    addressCountry: "CA",
  },
  parentOrganization: { "@type": "CollegeOrUniversity", name: "Concordia University" },
  sameAs: [CONTACT.instagram, CONTACT.linkedin, CONTACT.github],
};

export const websiteSchema = {
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  url: `${SITE_URL}/`,
  name: SITE_NAME,
  alternateName: SITE_FULL_NAME,
  publisher: { "@id": ORG_ID },
  inLanguage: "en-CA",
};

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function initials(name: string) {
  const parts = name
    .replace(/[^\p{L}\s-]/gu, "")
    .split(/[\s-]+/)
    .filter(Boolean);
  if (!parts.length) return "";
  // First letters of the first two name parts: "Giuseppe-Luca Cianflone" -> "GL".
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}
