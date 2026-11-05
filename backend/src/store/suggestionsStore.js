import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";

export const SUGGESTION_STATUSES = ["pending", "open", "planned", "in_progress", "done", "closed", "hidden"];
export const createSuggestionsStore = (databasePath = ":memory:") => {
  if (databasePath !== ":memory:") {
    fs.mkdirSync(path.dirname(path.resolve(databasePath)), { recursive: true, mode: 0o700 });
    fs.closeSync(fs.openSync(databasePath, "a", 0o600));
    fs.chmodSync(databasePath, 0o600);
  }
  const db = new DatabaseSync(databasePath);
  db.exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
    CREATE TABLE IF NOT EXISTS suggestions (
      id TEXT PRIMARY KEY, author TEXT NOT NULL, request_id TEXT NOT NULL, title TEXT NOT NULL,
      description TEXT NOT NULL, language TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL, score INTEGER NOT NULL DEFAULT 0, search_text TEXT NOT NULL DEFAULT '', UNIQUE(author, request_id));
    CREATE TABLE IF NOT EXISTS suggestion_votes (
      suggestion_id TEXT NOT NULL, voter TEXT NOT NULL, value INTEGER NOT NULL CHECK(value IN (-1,1)),
      PRIMARY KEY(suggestion_id,voter));
    CREATE TABLE IF NOT EXISTS suggestion_reports (
      suggestion_id TEXT NOT NULL, reporter TEXT NOT NULL, created_at INTEGER NOT NULL,
      PRIMARY KEY(suggestion_id,reporter));
    CREATE TABLE IF NOT EXISTS suggestion_blocks (viewer TEXT NOT NULL, author TEXT NOT NULL, PRIMARY KEY(viewer,author));
    CREATE INDEX IF NOT EXISTS suggestions_top ON suggestions(score DESC,created_at DESC,id DESC);
    CREATE INDEX IF NOT EXISTS suggestions_new ON suggestions(created_at DESC,id DESC);
    CREATE INDEX IF NOT EXISTS suggestions_author ON suggestions(author,created_at);
    CREATE TABLE IF NOT EXISTS suggestion_limits (actor TEXT NOT NULL, bucket TEXT NOT NULL, window INTEGER NOT NULL, hits INTEGER NOT NULL, PRIMARY KEY(actor,bucket));`);
  const searchable = value => value.normalize("NFKC").toLowerCase();
  // Additive migration for early installations of this isolated feature database.
  if (!db.prepare("PRAGMA table_info(suggestions)").all().some(column => column.name === "search_text")) {
    db.exec("ALTER TABLE suggestions ADD COLUMN search_text TEXT NOT NULL DEFAULT ''");
  }
  if (!db.prepare("PRAGMA table_info(suggestions)").all().some(column => column.name === "revision")) db.exec("ALTER TABLE suggestions ADD COLUMN revision INTEGER NOT NULL DEFAULT 0");
  db.exec("CREATE TABLE IF NOT EXISTS suggestion_moderation_log (id INTEGER PRIMARY KEY, suggestion_id TEXT NOT NULL, previous_status TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL)");
  db.exec("CREATE TABLE IF NOT EXISTS suggestion_admin_sessions (hash TEXT PRIMARY KEY, expires INTEGER NOT NULL)");
  for (const row of db.prepare("SELECT id,title,description FROM suggestions WHERE search_text='' ").all()) {
    db.prepare("UPDATE suggestions SET search_text=? WHERE id=?").run(searchable(`${row.title}\n${row.description}`), row.id);
  }
  const atomic = fn => {
    db.exec("BEGIN IMMEDIATE");
    try { const result = fn(); db.exec("COMMIT"); return result; }
    catch (error) { db.exec("ROLLBACK"); throw error; }
  };
  const fail = (code, status) => { const error = new Error(code); error.status = status; throw error; };
  const consume = (actor, bucket, maximum, windowMs) => {
    const window = Math.floor(Date.now() / windowMs);
    db.prepare(`INSERT INTO suggestion_limits VALUES (?,?,?,1) ON CONFLICT(actor,bucket) DO UPDATE SET
      hits=CASE WHEN window=excluded.window THEN hits+1 ELSE 1 END, window=excluded.window`).run(actor, bucket, window);
    if (db.prepare("SELECT hits FROM suggestion_limits WHERE actor=? AND bucket=?").get(actor, bucket).hits > maximum) fail("suggestions_rate_limited", 429);
  };
  const visible = (actor, id) => {
    const row = db.prepare(`SELECT s.* FROM suggestions s WHERE id=? AND status!='hidden'
      AND (status!='pending' OR author=?) AND NOT EXISTS (SELECT 1 FROM suggestion_blocks WHERE viewer=? AND author=s.author)`).get(id, actor, actor);
    if (!row) fail("suggestion_not_found", 404);
    return row;
  };
  const present = (row, actor) => ({
    id: row.id, title: row.title, description: row.description, language: row.language,
    status: row.status, createdAt: row.created_at, score: row.score, isOwn: row.author === actor,
    myVote: db.prepare("SELECT value FROM suggestion_votes WHERE suggestion_id=? AND voter=?").get(row.id, actor)?.value || 0,
  });
  const setStatus = (id,status,revision) => atomic(() => {
    if (!SUGGESTION_STATUSES.includes(status)) fail("invalid_status",400);
    const previous=db.prepare("SELECT status,revision FROM suggestions WHERE id=?").get(id);
    if (!previous) fail("suggestion_not_found",404);
    if (revision!==undefined && previous.revision!==revision) fail("suggestion_changed",409);
    db.prepare("UPDATE suggestions SET status=?,revision=revision+1 WHERE id=?").run(status,id);
    db.prepare("INSERT INTO suggestion_moderation_log(suggestion_id,previous_status,status,created_at) VALUES (?,?,?,?)").run(id,previous.status,status,Date.now());
  });
  return {
    adminSession(hash,expires) {
      if(expires) db.prepare("DELETE FROM suggestion_admin_sessions WHERE expires<=?").run(Date.now());
      if(expires===0) { db.prepare("DELETE FROM suggestion_admin_sessions WHERE hash=?").run(hash); return false; }
      if(expires) db.prepare("INSERT INTO suggestion_admin_sessions VALUES (?,?)").run(hash,expires);
      return !!db.prepare("SELECT 1 FROM suggestion_admin_sessions WHERE hash=? AND expires>?").get(hash,Date.now());
    },
    list(actor, { query = "", sort = "top", cursor = null, limit = 30 } = {}) {
      consume(actor, "read", 120, 60_000);
      const order = sort === "new" ? "created_at" : "score";
      // Keyset pagination avoids offset shifts when newer posts arrive. Refresh reconciles rank changes.
      const rows = db.prepare(`SELECT s.*, COALESCE(v.value,0) AS my_vote FROM suggestions s
        LEFT JOIN suggestion_votes v ON v.suggestion_id=s.id AND v.voter=?
        WHERE s.status!='hidden' AND (s.status!='pending' OR s.author=?)
        AND NOT EXISTS (SELECT 1 FROM suggestion_blocks b WHERE b.viewer=? AND b.author=s.author)
        AND instr(s.search_text,?)>0
        ${cursor ? `AND (s.${order}<@rank OR (s.${order}=@rank AND (s.created_at<@created OR (s.created_at=@created AND s.id<@id))))` : ""}
        ORDER BY s.${order} DESC,s.created_at DESC,s.id DESC LIMIT @limit`).all(
        ...(cursor ? [{ rank: cursor.rank, created: cursor.createdAt, id: cursor.id, limit: limit + 1 }] : [{ limit: limit + 1 }]),
        actor, actor, actor, searchable(query)
      );
      const items = rows.slice(0, limit).map(row => ({ id: row.id, title: row.title, description: row.description, language: row.language,
        status: row.status, createdAt: row.created_at, score: row.score, isOwn: row.author === actor, myVote: row.my_vote }));
      const last = items.at(-1);
      return { items, cursor: rows.length > limit ? { rank: sort === "new" ? last.createdAt : last.score, createdAt: last.createdAt, id: last.id } : null };
    },
    create(actor, { requestId, title, description, language }) {
      return atomic(() => {
        const previous = db.prepare("SELECT * FROM suggestions WHERE author=? AND request_id=?").get(actor, requestId);
        if (previous) {
          if (previous.title !== title || previous.description !== description) fail("request_id_conflict", 409);
          if (previous.status === "hidden") fail("suggestion_not_found", 404);
          return present(previous, actor);
        }
        consume(actor, "create", 5, 86_400_000);
        const id = crypto.randomUUID();
        db.prepare("INSERT INTO suggestions(id,author,request_id,title,description,language,created_at,search_text) VALUES (?,?,?,?,?,?,?,?)")
          .run(id, actor, requestId, title, description, language, Date.now(), searchable(`${title}\n${description}`));
        return present(visible(actor, id), actor);
      });
    },
    vote(actor, id, value) {
      return atomic(() => {
        const row = visible(actor, id);
        if (["pending", "closed", "done"].includes(row.status)) fail("voting_closed", 409);
        consume(actor, "vote", 60, 60_000);
        const previous = db.prepare("SELECT value FROM suggestion_votes WHERE suggestion_id=? AND voter=?").get(id, actor)?.value || 0;
        if (value === 0) db.prepare("DELETE FROM suggestion_votes WHERE suggestion_id=? AND voter=?").run(id, actor);
        else db.prepare("INSERT INTO suggestion_votes VALUES (?,?,?) ON CONFLICT(suggestion_id,voter) DO UPDATE SET value=excluded.value").run(id, actor, value);
        db.prepare("UPDATE suggestions SET score=score+? WHERE id=?").run(value - previous, id);
        return present(visible(actor, id), actor);
      });
    },
    report(actor, id) {
      return atomic(() => {
        visible(actor, id);
        consume(actor, "report", 20, 86_400_000);
        db.prepare("INSERT OR IGNORE INTO suggestion_reports VALUES (?,?,?)").run(id, actor, Date.now());
        return { ok: true };
      });
    },
    block(actor, id) {
      const row = visible(actor, id);
      if (row.author === actor) fail("cannot_block_self", 400);
      db.prepare("INSERT OR IGNORE INTO suggestion_blocks VALUES (?,?)").run(actor, row.author);
      return { ok: true };
    },
    unblock(actor) {
      db.prepare("DELETE FROM suggestion_blocks WHERE viewer=?").run(actor);
      return { ok: true };
    },
    withdraw(actor, id) {
      return atomic(() => {
        const row = visible(actor, id);
        if (row.author !== actor) fail("not_suggestion_owner", 403);
        db.prepare("UPDATE suggestions SET status='hidden',revision=revision+1 WHERE id=?").run(id);
        db.prepare("INSERT INTO suggestion_moderation_log(suggestion_id,previous_status,status,created_at) VALUES (?,?,?,?)").run(id,row.status,"hidden",Date.now());
        return { ok: true };
      });
    },
    moderate(id,status) { setStatus(id,status); },
    adminList({ status = "pending", query = "", offset = 0, reported = false, sort = "oldest" } = {}) {
      const where = `WHERE (?='all' OR s.status=?) AND instr(s.search_text,?)>0 AND (?=0 OR EXISTS (SELECT 1 FROM suggestion_reports r WHERE r.suggestion_id=s.id))`;
      const params = [status,status,searchable(query),Number(reported)];
      const columns = `s.id,s.title,substr(s.description,1,180) AS description,s.language,s.status,s.created_at AS createdAt,s.score,s.revision,(SELECT count(*) FROM suggestion_reports r WHERE r.suggestion_id=s.id) AS reports`;
      const order = sort === "top" ? "s.score DESC,s.created_at DESC" : sort === "newest" ? "s.created_at DESC" : "s.created_at ASC";
      const total = db.prepare(`SELECT count(*) AS count FROM suggestions s ${where}`).get(...params).count;
      offset=Math.min(offset,Math.max(0,Math.floor((total-1)/50)*50));
      const items = db.prepare(`SELECT ${columns} FROM suggestions s ${where} ORDER BY ${order},s.id LIMIT 50 OFFSET ?`).all(...params,offset);
      const counts = Object.fromEntries(SUGGESTION_STATUSES.map(value => [value,0]));
      for (const row of db.prepare("SELECT status,count(*) AS count FROM suggestions GROUP BY status").all()) counts[row.status] = row.count;
      return { items,total,counts,offset,nextOffset: offset+items.length<total ? offset+items.length : null };
    },
    adminDetail(id) {
      const row = db.prepare(`SELECT id,title,description,language,status,created_at AS createdAt,score,revision FROM suggestions WHERE id=?`).get(id);
      if (!row) fail("suggestion_not_found",404);
      return { ...row,reports:db.prepare("SELECT count(*) AS count FROM suggestion_reports WHERE suggestion_id=?").get(id).count,
        up:db.prepare("SELECT count(*) AS count FROM suggestion_votes WHERE suggestion_id=? AND value=1").get(id).count,
        down:db.prepare("SELECT count(*) AS count FROM suggestion_votes WHERE suggestion_id=? AND value=-1").get(id).count,
        history:db.prepare("SELECT previous_status AS previousStatus,status,created_at AS createdAt FROM suggestion_moderation_log WHERE suggestion_id=? ORDER BY id DESC LIMIT 20").all(id) };
    },
    adminModerate(id,status,revision) { setStatus(id,status,revision); return { ok:true }; },
    review(offset = 0) {
      return db.prepare(`SELECT s.id,s.title,s.description,s.language,s.status,s.created_at,s.score,
        (SELECT count(*) FROM suggestion_reports r WHERE r.suggestion_id=s.id) AS reports
        FROM suggestions s WHERE status!='hidden' ORDER BY reports DESC,created_at DESC,id DESC LIMIT 200 OFFSET ?`).all(offset);
    },
    close: () => db.close(),
  };
};
