import { z } from "zod";
import { config } from "./config.js";
import { createSuggestionsStore } from "./store/suggestionsStore.js";

export const suggestionsDatabasePath = () => {
  if (process.env.SUGGESTIONS_DATABASE_PATH) return process.env.SUGGESTIONS_DATABASE_PATH;
  if (config.databasePath === ":memory:" || (config.nodeEnv === "test" && !config.databasePath && !config.storePath)) return ":memory:";
  const persistentBase = config.databasePath || config.storePath;
  if (!persistentBase) throw new Error("suggestions_persistent_path_required");
  return `${persistentBase}.suggestions.sqlite`;
};
let store;
const getStore = () => { store ||= createSuggestionsStore(suggestionsDatabasePath()); return store; };
export const closeSuggestionsStore = () => { store?.close(); store = null; };
const identity = {
  appUserId: z.string().max(200).nullable().optional(),
  installId: z.string().max(200).nullable().optional(),
  platform: z.enum(["ios", "android"]).nullable().optional(),
};
const text = (min, max) => z.string().trim().min(min).max(max).refine(value => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value));
const id = z.string().uuid();
const schemas = {
  list: z.object({ ...identity, query: z.string().trim().max(120).default(""), sort: z.enum(["top", "new"]).default("top"),
    cursor: z.object({ rank: z.number().int().safe(), createdAt: z.number().int().positive().safe(), id }).strict().nullable().default(null),
    limit: z.number().int().min(1).max(50).default(30) }).strict(),
  create: z.object({ ...identity, requestId: id, title: text(5, 100), description: text(10, 1500), language: text(2, 16) }).strict(),
  vote: z.object({ ...identity, id, value: z.union([z.literal(-1), z.literal(0), z.literal(1)]) }).strict(),
  report: z.object({ ...identity, id }).strict(),
  block: z.object({ ...identity, id }).strict(),
  unblock: z.object({ ...identity }).strict(),
  withdraw: z.object({ ...identity, id }).strict(),
};
export const registerSuggestionsRoutes = (app, limiter, auth) => {
  for (const action of Object.keys(schemas)) {
    app.post(`/v1/suggestions/${action}`, limiter, auth, (req, res, next) => {
      // Old legacy sessions cannot claim a board by naming another installation.
      const actor = req.authSession?.suggestionsActor;
      if (!actor) return res.status(401).json({ error: "session_auth_required" });
      const parsed = schemas[action].safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "invalid_suggestion_request" });
      res.set("Cache-Control", "no-store");
      const payload = parsed.data;
      try {
        const service = getStore();
        const result = action === "list" ? service.list(actor, payload)
          : action === "create" ? { item: service.create(actor, payload) }
          : action === "vote" ? { item: service.vote(actor, payload.id, payload.value) }
          : service[action](actor, payload.id);
        return res.status(action === "create" ? 201 : 200).json(result);
      } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        return res.status(503).json({ error: "suggestions_unavailable" });
      }
    });
  }
};
