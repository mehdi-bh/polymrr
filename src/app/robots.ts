import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/profile/", "/markets/create"],
    },
    sitemap: "https://www.polymrr.com/sitemap.xml",
  };
}
