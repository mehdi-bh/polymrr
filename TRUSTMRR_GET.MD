API / Endpoints

GET
/api/v1/startups/{slug}
Returns full details for a single startup, including tech stack, cofounders, social metrics, and the complete description. Use the slug value from the list endpoint.

Path parameters
Parameter	Type	Required	Description
slug	string	required	The startup's URL-friendly identifier. Get this from the list endpoint's slug field.
Request
cURL

Copy
curl -s "https://trustmrr.com/api/v1/startups/shipfast" \
  -H "Authorization: Bearer tmrr_your_api_key"
JavaScript (fetch)

Copy
const slug = "shipfast";

const response = await fetch(
  `https://trustmrr.com/api/v1/startups/${slug}`,
  {
    headers: {
      Authorization: "Bearer tmrr_your_api_key",
    },
  }
);

const { data } = await response.json();
console.log(data.name, "—", data.revenue.mrr / 100, "$/mo MRR");
Python (requests)

Copy
import requests

slug = "shipfast"

response = requests.get(
    f"https://trustmrr.com/api/v1/startups/{slug}",
    headers={"Authorization": "Bearer tmrr_your_api_key"},
)

data = response.json()["data"]
print(f"{data['name']} — ${data['revenue']['mrr'] / 100:.0f}/mo MRR")
Response fields
The data object contains all fields from the list endpoint plus additional detail fields. All monetary values are in USD cents.

Additional fields vs. list endpoint

This endpoint returns the full description (not truncated), plus: xFollowerCount, isMerchantOfRecord, techStack, and cofounders.

Field	Type	Description
name	string	Startup name
slug	string	URL-friendly identifier
icon	string | null	URL to the startup's icon/logo
description	string | null	Full description (not truncated, unlike the list endpoint)
website	string | null	Startup's website URL
country	string | null	Country code (ISO 3166-1 alpha-2)
foundedDate	string | null	When the startup was founded (ISO date)
category	string | null	Primary category (e.g. saas, ai, ecommerce)
paymentProvider	string	Payment provider used for revenue verification (stripe, lemonsqueezy, polar, revenuecat, dodopayment)
targetAudience	string | null	Target audience (b2b, b2c, or both)
revenue.last30Days	number	Verified revenue in the last 30 days, in USD cents
revenue.mrr	number	Monthly recurring revenue, in USD cents
revenue.total	number	All-time total revenue, in USD cents
customers	number	Total customer count
activeSubscriptions	number	Number of currently active subscriptions
askingPrice	number | null	Asking price in USD cents
profitMarginLast30Days	number | null	Profit margin over the last 30 days (0-100 percentage)
growth30d	number | null	Revenue growth over the last 30 days as a percentage (e.g. 24 = 24% growth)
multiple	number | null	Asking price / annualized revenue
onSale	boolean	Whether the startup is currently listed for sale
firstListedForSaleAt	string | null	When the startup was first listed for sale (ISO date)
xHandle	string | null	X (Twitter) handle without the @ symbol
xFollowerCount	number | null	Number of X (Twitter) followers
isMerchantOfRecord	boolean	Whether the startup uses a merchant of record (handles tax/compliance)
techStack[]	object[]	Array of technologies used
techStack[].slug	string	Technology identifier (e.g. nextjs, react, tailwindcss)
techStack[].category	string	Technology category (e.g. framework, language, database, hosting)
cofounders[]	object[]	Array of cofounders
cofounders[].xHandle	string	Cofounder's X (Twitter) handle
cofounders[].xName	string | null	Cofounder's display name
Example response
200 OK

Copy
{
  "data": {
    "name": "ShipFast",
    "slug": "shipfast",
    "icon": "https://cdn.trustmrr.com/icons/shipfast.png",
    "description": "The NextJS boilerplate with all you need to build your SaaS, AI tool, or any other web app. From idea to production in 5 minutes.",
    "website": "https://shipfa.st",
    "country": "TH",
    "foundedDate": "2023-09-01T00:00:00.000Z",
    "category": "saas",
    "paymentProvider": "stripe",
    "targetAudience": "b2b",
    "revenue": {
      "last30Days": 4250000,
      "mrr": 180000,
      "total": 98000000
    },
    "customers": 7800,
    "activeSubscriptions": 320,
    "askingPrice": 50000000,
    "profitMarginLast30Days": 92,
    "growth30d": 0.12,
    "multiple": 0.98,
    "onSale": true,
    "firstListedForSaleAt": "2025-11-15T08:30:00.000Z",
    "xHandle": "shipaborad",
    "xFollowerCount": 15400,
    "isMerchantOfRecord": false,
    "techStack": [
      { "slug": "nextjs", "category": "framework" },
      { "slug": "mongodb", "category": "database" },
      { "slug": "tailwindcss", "category": "css" },
      { "slug": "stripe", "category": "payments" }
    ],
    "cofounders": [
      { "xHandle": "marc_louvion", "xName": "Marc Lou" }
    ]
  }
}
Errors
400
Invalid slug

Copy
{ "error": "Slug is required" }
404
Startup not found

Copy
{ "error": "Startup not found" }
Common use cases
Get details then display tech stack
JavaScript

Copy
const res = await fetch(
  "https://trustmrr.com/api/v1/startups/shipfast",
  { headers: { Authorization: "Bearer tmrr_your_api_key" } }
);
const { data } = await res.json();

const techs = data.techStack.map((t) => t.slug).join(", ");
console.log(`${data.name} uses: ${techs}`);
// → "ShipFast uses: nextjs, mongodb, tailwindcss, stripe"
List all startups then fetch details for each
JavaScript

Copy
const headers = { Authorization: "Bearer tmrr_your_api_key" };
const BASE = "https://trustmrr.com/api/v1/startups";

// Step 1: Get list of startups
const listRes = await fetch(`${BASE}?limit=5&sort=revenue-desc`, { headers });
const { data: startups } = await listRes.json();

// Step 2: Fetch details for each
for (const startup of startups) {
  const detailRes = await fetch(`${BASE}/${startup.slug}`, { headers });
  const { data } = await detailRes.json();

  console.log(`${data.name} (${data.techStack.length} technologies)`);
}
