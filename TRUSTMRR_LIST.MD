API / Endpoints

GET
/api/v1/startups
Returns a paginated list of startups with verified revenue on TrustMRR. Filter by sale status, category, revenue range, or price range, and sort by different criteria.

Request
cURL

Copy
curl -s "https://trustmrr.com/api/v1/startups?sort=revenue-desc&limit=10" \
  -H "Authorization: Bearer tmrr_your_api_key"
JavaScript (fetch)

Copy
const response = await fetch(
  "https://trustmrr.com/api/v1/startups?sort=revenue-desc&limit=10",
  {
    headers: {
      Authorization: "Bearer tmrr_your_api_key",
    },
  }
);

const { data, meta } = await response.json();
console.log(`Found ${meta.total} startups`);
Python (requests)

Copy
import requests

response = requests.get(
    "https://trustmrr.com/api/v1/startups",
    params={"sort": "revenue-desc", "limit": 10},
    headers={"Authorization": "Bearer tmrr_your_api_key"},
)

data = response.json()
print(f"Found {data['meta']['total']} startups")
Query parameters
Parameter	Type	Default	Description
page	integer	1	Page number for pagination. Starts at 1.
limit	integer	10	Number of results per page. Min 1, max 50.
sort	string	revenue-desc	Sort order. One of: revenue-desc, revenue-asc, price-desc, price-asc, multiple-asc, multiple-desc, growth-desc, growth-asc, listed-desc, listed-asc, best-deal. Default is revenue-desc, or best-deal when onSale=true.
onSale	string	null	Filter by sale status. "true" returns only startups listed for sale. "false" returns only startups not for sale. Omit to return all startups.
category	string	null	Filter by startup category. One of: 
ai
saas
developer-tools
fintech
marketing
ecommerce
productivity
design-tools
no-code
analytics
crypto-web3
education
health-fitness
social-media
content-creation
sales
customer-support
recruiting
real-estate
travel
legal
security
iot-hardware
green-tech
entertainment
games
community
news-magazines
utilities
marketplace
mobile-apps

Browse all categories on TrustMRR
xHandle	string	null	Filter by the founder's X (Twitter) handle. Omit the @ symbol. Example: "marc_louvion".
minRevenue	number	null	Minimum last-30-days revenue in USD cents. Example: 10000 = $100.
maxRevenue	number	null	Maximum last-30-days revenue in USD cents. Example: 500000 = $5,000.
minMrr	number	null	Minimum monthly recurring revenue in USD cents. Example: 50000 = $500.
maxMrr	number	null	Maximum monthly recurring revenue in USD cents. Example: 1000000 = $10,000.
minGrowth	number	null	Minimum 30-day revenue growth as a decimal. Example: 0.1 = 10% growth.
maxGrowth	number	null	Maximum 30-day revenue growth as a decimal. Example: 0.5 = 50% growth.
minPrice	number	null	Minimum asking price in USD cents. Example: 1000000 = $10,000.
maxPrice	number	null	Maximum asking price in USD cents. Example: 10000000 = $100,000.
Sort options
Value	Description
revenue-desc	Highest last-30-days revenue first (default)
revenue-asc	Lowest last-30-days revenue first
price-desc	Highest asking price first
price-asc	Lowest asking price first
multiple-asc	Lowest revenue multiple first (best value)
multiple-desc	Highest revenue multiple first
growth-desc	Fastest growing first
growth-asc	Slowest growing first
listed-desc	Most recently listed first
listed-asc	Oldest listings first
best-deal	Best acquisition deals first (default when onSale=true)
Response fields
Each item in the data array has the following shape. All monetary values are in USD cents (e.g. 42500 = $425.00).

Field	Type	Description
name	string	Startup name
slug	string	URL-friendly identifier. Use this for the /startups/{slug} endpoint.
icon	string | null	URL to the startup's icon/logo
description	string | null	Short description, truncated to 200 characters
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
askingPrice	number | null	Asking price in USD cents, if listed for sale
profitMarginLast30Days	number | null	Profit margin over the last 30 days (0-100 percentage)
growth30d	number | null	Revenue growth over the last 30 days as a percentage (e.g. 24 = 24% growth)
multiple	number | null	Asking price divided by annualized revenue (price / (last30Days * 12))
onSale	boolean	Whether the startup is currently listed for sale
firstListedForSaleAt	string | null	When the startup was first listed for sale (ISO date)
xHandle	string | null	X (Twitter) handle without the @ symbol
Pagination
The meta object tells you where you are in the result set. Keep incrementing page until hasMore is false.

Field	Type	Description
meta.total	integer	Total matching startups across all pages
meta.page	integer	Current page number
meta.limit	integer	Results per page
meta.hasMore	boolean	Whether there are more pages after this one
Example response
200 OK

Copy
{
  "data": [
    {
      "name": "ShipFast",
      "slug": "shipfast",
      "icon": "https://cdn.trustmrr.com/icons/shipfast.png",
      "description": "The NextJS boilerplate with all you need to build your SaaS, AI tool, or any other web app...",
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
      "xHandle": "shipaborad"
    }
  ],
  "meta": {
    "total": 142,
    "page": 1,
    "limit": 10,
    "hasMore": true
  }
}
Common use cases
Get the top 10 startups by revenue

Copy
curl -s "https://trustmrr.com/api/v1/startups?sort=revenue-desc&limit=10" \
  -H "Authorization: Bearer tmrr_your_api_key"
Get the 5 most recently listed startups for sale

Copy
curl -s "https://trustmrr.com/api/v1/startups?onSale=true&sort=listed-desc&limit=5" \
  -H "Authorization: Bearer tmrr_your_api_key"
Find SaaS startups earning $1k–$5k/month

Copy
curl -s "https://trustmrr.com/api/v1/startups?category=saas&minRevenue=100000&maxRevenue=500000&sort=growth-desc" \
  -H "Authorization: Bearer tmrr_your_api_key"
Get the cheapest startups for sale under $10k

Copy
curl -s "https://trustmrr.com/api/v1/startups?onSale=true&maxPrice=1000000&sort=price-asc&limit=20" \
  -H "Authorization: Bearer tmrr_your_api_key"
Find all startups by a specific founder

Copy
curl -s "https://trustmrr.com/api/v1/startups?xHandle=marclou" \
  -H "Authorization: Bearer tmrr_your_api_key"
Paginate through all results
JavaScript

Copy
const API_KEY = "tmrr_your_api_key";
const BASE = "https://trustmrr.com/api/v1/startups";

let page = 1;
let hasMore = true;
const allStartups = [];

while (hasMore) {
  const res = await fetch(`${BASE}?page=${page}&limit=50`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  const { data, meta } = await res.json();

  allStartups.push(...data);
  hasMore = meta.hasMore;
  page++;
}

console.log(`Fetched ${allStartups.length} startups total`);