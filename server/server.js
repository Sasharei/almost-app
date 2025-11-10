import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import NodeCache from "node-cache";

const app = express();

const PORT = process.env.PORT || 8080;
const AFFILIATE_TAG = process.env.AFFILIATE_TAG || "almostappstor-20";
const DEFAULT_DOMAIN = process.env.AMAZON_DOMAIN || "amazon.com";
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

const allowedOrigins = [/^http:\/\/localhost:19(000|001|002|003|004|005|006)$/];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.some((pattern) => pattern.test(origin))) return callback(null, true);
      return callback(null, true);
    },
  })
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localProductsPath = path.resolve(__dirname, "products.json");

const appendAffiliateTag = (url) => {
  if (!url) return null;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}tag=${encodeURIComponent(AFFILIATE_TAG)}`;
};

const extractAsin = (url) => {
  const match = url && url.match(/\/([A-Z0-9]{10})(?=[/?]|$)/i);
  return match ? match[1].toUpperCase() : null;
};

const normalizeProduct = (item) => {
  if (!item) return null;
  return {
    asin: item.asin || null,
    title: item.title || "",
    image: item.image || null,
    price: item.price || null,
    rating: item.rating || null,
    ratings_total: item.ratings_total || null,
    url: item.url ? appendAffiliateTag(item.url) : null,
  };
};

async function searchSerpApi(query, domain) {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return null;

  const params = {
    engine: "google",
    google_domain: "google.com",
    q: `site:${domain} ${query}`,
    api_key: apiKey,
  };

  const { data } = await axios.get("https://serpapi.com/search.json", { params, timeout: 8000 });
  const results = (data.organic_results || []).map((result) => {
    const url = result.link || result.cached_page_link || result.formatted_url;
    const asin = extractAsin(url);
    return normalizeProduct({
      asin,
      title: result.title,
      image: result.thumbnail,
      price: result.price?.raw || null,
      rating: result.rating,
      ratings_total: result.reviews,
      url,
    });
  });

  return { products: results.filter(Boolean), source: "serpapi" };
}

async function searchRainforest(query, domain) {
  const apiKey = process.env.RAINFOREST_KEY;
  if (!apiKey) return null;

  const params = {
    api_key: apiKey,
    type: "search",
    amazon_domain: domain,
    search_term: query,
  };

  const { data } = await axios.get("https://api.rainforestapi.com/request", { params, timeout: 8000 });
  const results = (data.search_results || []).map((result) => {
    const asin = result.asin || extractAsin(result.link);
    return normalizeProduct({
      asin,
      title: result.title,
      image: result.image,
      price: result.price?.raw,
      rating: result.rating,
      ratings_total: result.reviews,
      url: result.link,
    });
  });

  return { products: results.filter(Boolean), source: "rainforest" };
}

async function searchFallback(query) {
  try {
    const raw = fs.readFileSync(localProductsPath, "utf8");
    const data = JSON.parse(raw);
    const normalizedQuery = query.toLowerCase();
    const products = data
      .filter((product) => product.title?.toLowerCase().includes(normalizedQuery))
      .map((product) =>
        normalizeProduct({
          ...product,
          url: product.url,
        })
      );
    return { products, source: "local" };
  } catch {
    return { products: [], source: "local" };
  }
}

app.get("/api/health", (_, res) => {
  res.json({ ok: true });
});

app.get("/api/search", async (req, res) => {
  const query = (req.query.q || "").trim();
  const domain = (req.query.domain || DEFAULT_DOMAIN).trim();

  if (!query) {
    return res.status(400).json({ error: "missing q" });
  }

  const cacheKey = `search:${domain}:${query}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const providers = [
    () => searchSerpApi(query, domain),
    () => searchRainforest(query, domain),
    () => searchFallback(query),
  ];

  for (const provider of providers) {
    try {
      const result = await provider();
      if (result) {
        cache.set(cacheKey, result);
        return res.json(result);
      }
    } catch (error) {
      console.error(`[provider error]: ${error.message}`);
    }
  }

  res.status(500).json({ error: "all providers failed" });
});

app.listen(PORT, () => {
  console.log(`Amazon proxy running on http://localhost:${PORT}`);
});
