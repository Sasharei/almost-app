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
  if (/\btag=/.test(url)) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}tag=${encodeURIComponent(AFFILIATE_TAG)}`;
};

const extractAsin = (url) => {
  const match = url && url.match(/\/([A-Z0-9]{10})(?=[/?]|$)/i);
  return match ? match[1].toUpperCase() : null;
};

const coercePrice = (price) => {
  if (price === null || price === undefined) return { label: null, value: null };
  if (typeof price === "number") {
    return { label: `$${price}`, value: price };
  }
  if (typeof price === "string") {
    const numeric = parseFloat(price.replace(/[^0-9.,]/g, "").replace(",", "."));
    return { label: price, value: Number.isFinite(numeric) ? numeric : null };
  }
  if (typeof price === "object") {
    if (typeof price.extracted === "number") {
      return { label: price.raw || price.display || `$${price.extracted}`, value: price.extracted };
    }
    if (typeof price.value === "number") {
      return { label: price.raw || `$${price.value}`, value: price.value };
    }
    if (typeof price.amount === "number") {
      const symbol = price.symbol || price.currency || "$";
      return { label: price.raw || `${symbol}${price.amount}`, value: price.amount };
    }
    if (price.raw) {
      const numeric = parseFloat(price.raw.replace(/[^0-9.,]/g, "").replace(",", "."));
      return { label: price.raw, value: Number.isFinite(numeric) ? numeric : null };
    }
  }
  return { label: null, value: null };
};

const pickImageUrl = (item) =>
  item?.image ||
  item?.thumbnail ||
  item?.image_url ||
  item?.main_image?.link ||
  item?.main_image ||
  null;

const normalizeProduct = (item, domain = DEFAULT_DOMAIN) => {
  if (!item) return null;
  const asin = item.asin || extractAsin(item.url) || extractAsin(item.link);
  const { label: priceLabel, value: priceValue } = coercePrice(item.price);
  const rawUrl = item.url || item.link || (asin ? `https://${domain}/dp/${asin}` : null);
  return {
    asin: asin || null,
    title: item.title || item.name || "",
    image: pickImageUrl(item),
    price: item.price_label || priceLabel,
    price_value: priceValue,
    rating: item.rating ?? item.stars ?? item.reviews_rating ?? null,
    ratings_total: item.ratings_total ?? item.reviews_total ?? item.reviews ?? item.reviews_count ?? null,
    url: rawUrl ? appendAffiliateTag(rawUrl) : null,
  };
};

async function searchSerpApi(query, domain) {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return null;

  const tryAmazonEngine = async () => {
    const params = {
      engine: "amazon",
      amazon_domain: domain,
      search_term: query,
      api_key: apiKey,
    };
    const { data } = await axios.get("https://serpapi.com/search.json", { params, timeout: 8000 });
    const results = (data.search_results || data.organic_results || []).map((result) => {
      const asin = result.asin || extractAsin(result.link);
      return normalizeProduct(
        {
          asin,
          title: result.title,
          image: result.image || result.thumbnail,
          price: result.price,
          rating: result.rating,
          ratings_total: result.reviews,
          url: result.link || result.product_link,
        },
        domain
      );
    });
    return { products: results.filter(Boolean), source: "serpapi-amazon" };
  };

  try {
    const amazonData = await tryAmazonEngine();
    if (amazonData.products.length) return amazonData;
  } catch (error) {
    console.warn(`[serpapi-amazon] ${error.message}`);
  }

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
    const snippetPrice =
      result.price ||
      result.inline_price ||
      result.rich_snippet?.top?.extensions?.find((ext) => /\$\d/.test(ext));
    return normalizeProduct(
      {
        asin,
        title: result.title,
        image: result.thumbnail,
        price: snippetPrice,
        rating: result.rating,
        ratings_total: result.reviews,
        url,
      },
      domain
    );
  });

  return { products: results.filter(Boolean), source: "serpapi-google" };
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
    return normalizeProduct(
      {
        asin,
        title: result.title,
        image: result.image,
        price: result.price,
        rating: result.rating,
        ratings_total: result.reviews,
        url: result.link,
      },
      domain
    );
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
        normalizeProduct(
          {
            ...product,
            price: product.price_value
              ? { raw: product.price, value: product.price_value }
              : product.price,
            url: product.url,
          },
          DEFAULT_DOMAIN
        )
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
  const skipCache = Boolean(req.query.nocache);

  if (!query) {
    return res.status(400).json({ error: "missing q" });
  }

  const cacheKey = `search:${domain}:${query}`;
  const cached = !skipCache ? cache.get(cacheKey) : null;
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
        if (!skipCache) {
          cache.set(cacheKey, result);
        }
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
