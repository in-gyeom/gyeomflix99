require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const app = express();
const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || "0.0.0.0";
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL || null;
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, "data");
const DATA_FILE = process.env.DATA_FILE ? path.resolve(process.env.DATA_FILE) : path.join(DATA_DIR, "store.json");
const YEAR_CATEGORIES = new Set(["2023", "2024", "2025"]);
const GENRE_CATEGORIES = new Set(["action", "comedy"]);
const CONTENT_TYPES = new Set(["genre", "art_progress"]);

function resolveFrontendDistDir() {
  const candidates = [
    path.join(__dirname, "dist"),
    path.join(__dirname, "dist", "dist"),
    path.join(__dirname, "..", "frontend", "dist"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "index.html"))) {
      return candidate;
    }
  }

  return null;
}

const FRONTEND_DIST_DIR = resolveFrontendDistDir();
const FRONTEND_INDEX_FILE = FRONTEND_DIST_DIR ? path.join(FRONTEND_DIST_DIR, "index.html") : null;

if (!FRONTEND_INDEX_FILE) {
  throw new Error(
    "Frontend dist not found. Build the frontend export and copy it into backend/dist before starting the server.",
  );
}

// 미들웨어 설정
app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

function createInitialStore() {
  return {
    profile: null,
    genres: [],
    artProgress: [],
    comments: [],
  };
}

function ensureStoreFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(createInitialStore(), null, 2), "utf8");
  }
}

function readStore() {
  ensureStoreFile();

  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    const rawGenres = Array.isArray(parsed.genres) ? parsed.genres : [];
    const normalizedGenres = rawGenres
      .filter((genre) => genre && typeof genre === "object")
      .map((genre) => ({
        ...genre,
        category: GENRE_CATEGORIES.has(genre.category) ? genre.category : "action",
      }));

    return {
      profile: parsed.profile ?? null,
      genres: normalizedGenres,
      artProgress: Array.isArray(parsed.artProgress) ? parsed.artProgress : [],
      comments: Array.isArray(parsed.comments) ? parsed.comments : [],
    };
  } catch {
    const fallback = createInitialStore();
    fs.writeFileSync(DATA_FILE, JSON.stringify(fallback, null, 2), "utf8");
    return fallback;
  }
}

function writeStore(store) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

function nowIso() {
  return new Date().toISOString();
}

function sortByCreatedAtDesc(items) {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return bTime - aTime;
  });
}

// 기본 헬스체크 라우트
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "백엔드 서버가 정상적으로 동작중입니다.",
    host: HOST,
    port: PORT,
    publicUrl: RENDER_EXTERNAL_URL,
    dataDir: path.relative(__dirname, DATA_DIR).replace(/\\/g, "/"),
    frontendDist: FRONTEND_DIST_DIR
      ? path.relative(__dirname, FRONTEND_DIST_DIR).replace(/\\/g, "/")
      : null,
  });
});

app.get("/api/profile", (req, res) => {
  const store = readStore();
  res.json({ profile: store.profile });
});

app.put("/api/profile", (req, res) => {
  const { profile_text, profile_image_url } = req.body || {};

  if (profile_text !== undefined && typeof profile_text !== "string") {
    return res.status(400).json({ error: "profile_text는 문자열이어야 합니다." });
  }

  if (
    profile_image_url !== undefined &&
    profile_image_url !== null &&
    typeof profile_image_url !== "string"
  ) {
    return res.status(400).json({ error: "profile_image_url은 문자열 또는 null이어야 합니다." });
  }

  const store = readStore();
  const now = nowIso();

  if (!store.profile) {
    store.profile = {
      id: randomUUID(),
      profile_image_url: profile_image_url ?? null,
      profile_text: profile_text ?? null,
      created_at: now,
      updated_at: now,
    };
  } else {
    store.profile = {
      ...store.profile,
      profile_image_url:
        profile_image_url !== undefined
          ? profile_image_url
          : store.profile.profile_image_url,
      profile_text:
        profile_text !== undefined
          ? profile_text
          : store.profile.profile_text,
      updated_at: now,
    };
  }

  writeStore(store);
  res.json({ profile: store.profile });
});

app.get("/api/genres", (req, res) => {
  const store = readStore();
  const genres = sortByCreatedAtDesc(store.genres);
  if (req.query.summary === "1") {
    const summaries = genres.map((genre) => ({
      ...genre,
      images: [],
      image_count: Array.isArray(genre.images) ? genre.images.length : 0,
    }));
    res.json({ genres: summaries });
    return;
  }
  res.json({ genres });
});

app.get("/api/genres/:id", (req, res) => {
  const id = typeof req.params.id === "string" ? req.params.id.trim() : "";

  if (!id) {
    return res.status(400).json({ error: "id 값이 필요합니다." });
  }

  const store = readStore();
  const genre = store.genres.find((item) => item.id === id);

  if (!genre) {
    return res.status(404).json({ error: "작품을 찾을 수 없습니다." });
  }

  res.json({ genre });
});

app.post("/api/genres", (req, res) => {
  const { title, category, description, thumbnail_url, images } = req.body || {};

  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "title은 비어있지 않은 문자열이어야 합니다." });
  }

  if (typeof category !== "string" || !GENRE_CATEGORIES.has(category)) {
    return res.status(400).json({ error: "category 값이 올바르지 않습니다." });
  }

  if (!Array.isArray(images) || images.length === 0 || images.some((image) => typeof image !== "string")) {
    return res.status(400).json({ error: "images는 하나 이상의 문자열 배열이어야 합니다." });
  }

  if (description !== undefined && description !== null && typeof description !== "string") {
    return res.status(400).json({ error: "description은 문자열 또는 null이어야 합니다." });
  }

  if (thumbnail_url !== undefined && thumbnail_url !== null && typeof thumbnail_url !== "string") {
    return res.status(400).json({ error: "thumbnail_url은 문자열 또는 null이어야 합니다." });
  }

  const store = readStore();
  const now = nowIso();
  const genre = {
    id: randomUUID(),
    category,
    title: title.trim(),
    description: description?.trim() || null,
    thumbnail_url: thumbnail_url || images[0],
    images,
    created_at: now,
    updated_at: now,
  };

  store.genres.unshift(genre);
  writeStore(store);
  res.status(201).json({ genre });
});

app.put("/api/genres/:id", (req, res) => {
  const id = typeof req.params.id === "string" ? req.params.id.trim() : "";

  if (!id) {
    return res.status(400).json({ error: "id 값이 필요합니다." });
  }

  const { title, category, description, thumbnail_url } = req.body || {};

  if (title !== undefined && (typeof title !== "string" || !title.trim())) {
    return res.status(400).json({ error: "title은 비어있지 않은 문자열이어야 합니다." });
  }

  if (category !== undefined && (typeof category !== "string" || !GENRE_CATEGORIES.has(category))) {
    return res.status(400).json({ error: "category 값이 올바르지 않습니다." });
  }

  if (description !== undefined && description !== null && typeof description !== "string") {
    return res.status(400).json({ error: "description은 문자열 또는 null이어야 합니다." });
  }

  if (thumbnail_url !== undefined && thumbnail_url !== null && typeof thumbnail_url !== "string") {
    return res.status(400).json({ error: "thumbnail_url은 문자열 또는 null이어야 합니다." });
  }

  const store = readStore();
  const genreIndex = store.genres.findIndex((genre) => genre.id === id);

  if (genreIndex === -1) {
    return res.status(404).json({ error: "작품을 찾을 수 없습니다." });
  }

  const existing = store.genres[genreIndex];
  const now = nowIso();
  const updated = {
    ...existing,
    title: title !== undefined ? title.trim() : existing.title,
    category: category !== undefined ? category : existing.category,
    description: description !== undefined ? (description?.trim() || null) : existing.description,
    thumbnail_url: thumbnail_url !== undefined ? thumbnail_url : existing.thumbnail_url,
    updated_at: now,
  };

  store.genres[genreIndex] = updated;
  writeStore(store);
  res.json({ genre: updated });
});

app.delete("/api/genres/:id", (req, res) => {
  const id = typeof req.params.id === "string" ? req.params.id.trim() : "";

  if (!id) {
    return res.status(400).json({ error: "id 값이 필요합니다." });
  }

  const store = readStore();
  const genreIndex = store.genres.findIndex((genre) => genre.id === id);

  if (genreIndex === -1) {
    return res.status(404).json({ error: "삭제할 작품을 찾을 수 없습니다." });
  }

  store.genres.splice(genreIndex, 1);
  store.comments = store.comments.filter(
    (comment) => !(comment.content_type === "genre" && comment.content_id === id),
  );

  writeStore(store);
  res.json({ deletedId: id });
});

app.get("/api/art-progress", (req, res) => {
  const store = readStore();
  const artProgress = sortByCreatedAtDesc(store.artProgress);
  if (req.query.summary === "1") {
    const summaries = artProgress.map((art) => ({
      ...art,
      images: [],
      image_count: Array.isArray(art.images) ? art.images.length : 0,
    }));
    res.json({ artProgress: summaries });
    return;
  }
  res.json({ artProgress });
});

app.get("/api/art-progress/:id", (req, res) => {
  const id = typeof req.params.id === "string" ? req.params.id.trim() : "";

  if (!id) {
    return res.status(400).json({ error: "id 값이 필요합니다." });
  }

  const store = readStore();
  const art = store.artProgress.find((item) => item.id === id);

  if (!art) {
    return res.status(404).json({ error: "작품을 찾을 수 없습니다." });
  }

  res.json({ artProgress: art });
});

app.post("/api/art-progress", (req, res) => {
  const { title, year_category, thumbnail_url, images } = req.body || {};

  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "title은 비어있지 않은 문자열이어야 합니다." });
  }

  if (typeof year_category !== "string" || !YEAR_CATEGORIES.has(year_category)) {
    return res.status(400).json({ error: "year_category 값이 올바르지 않습니다." });
  }

  if (!Array.isArray(images) || images.length === 0 || images.some((image) => typeof image !== "string")) {
    return res.status(400).json({ error: "images는 하나 이상의 문자열 배열이어야 합니다." });
  }

  if (thumbnail_url !== undefined && thumbnail_url !== null && typeof thumbnail_url !== "string") {
    return res.status(400).json({ error: "thumbnail_url은 문자열 또는 null이어야 합니다." });
  }

  const store = readStore();
  const now = nowIso();
  const art = {
    id: randomUUID(),
    title: title.trim(),
    thumbnail_url: thumbnail_url || images[0],
    images,
    year_category,
    created_at: now,
    updated_at: now,
  };

  store.artProgress.unshift(art);
  writeStore(store);
  res.status(201).json({ artProgress: art });
});

app.delete("/api/art-progress/:id", (req, res) => {
  const id = typeof req.params.id === "string" ? req.params.id.trim() : "";

  if (!id) {
    return res.status(400).json({ error: "id 값이 필요합니다." });
  }

  const store = readStore();
  const artIndex = store.artProgress.findIndex((art) => art.id === id);

  if (artIndex === -1) {
    return res.status(404).json({ error: "삭제할 작품을 찾을 수 없습니다." });
  }

  store.artProgress.splice(artIndex, 1);
  store.comments = store.comments.filter(
    (comment) => !(comment.content_type === "art_progress" && comment.content_id === id),
  );

  writeStore(store);
  res.json({ deletedId: id });
});

app.get("/api/comments", (req, res) => {
  const contentType = typeof req.query.contentType === "string" ? req.query.contentType : undefined;
  const contentId = typeof req.query.contentId === "string" ? req.query.contentId : undefined;

  if (contentType && !CONTENT_TYPES.has(contentType)) {
    return res.status(400).json({ error: "contentType 값이 올바르지 않습니다." });
  }

  const store = readStore();
  let comments = sortByCreatedAtDesc(store.comments);

  if (contentType) {
    comments = comments.filter((comment) => comment.content_type === contentType);
  }

  if (contentId) {
    comments = comments.filter((comment) => comment.content_id === contentId);
  }

  res.json({ comments });
});

app.post("/api/comments", (req, res) => {
  const { content_type, content_id, author_name, comment_text } = req.body || {};

  if (typeof content_type !== "string" || !CONTENT_TYPES.has(content_type)) {
    return res.status(400).json({ error: "content_type 값이 올바르지 않습니다." });
  }

  if (typeof content_id !== "string" || !content_id.trim()) {
    return res.status(400).json({ error: "content_id는 비어있지 않은 문자열이어야 합니다." });
  }

  if (typeof author_name !== "string" || !author_name.trim()) {
    return res.status(400).json({ error: "author_name은 비어있지 않은 문자열이어야 합니다." });
  }

  if (typeof comment_text !== "string" || !comment_text.trim()) {
    return res.status(400).json({ error: "comment_text는 비어있지 않은 문자열이어야 합니다." });
  }

  const store = readStore();
  const comment = {
    id: randomUUID(),
    content_type,
    content_id: content_id.trim(),
    author_name: author_name.trim(),
    comment_text: comment_text.trim(),
    created_at: nowIso(),
  };

  store.comments.unshift(comment);
  writeStore(store);
  res.status(201).json({ comment });
});

app.use("/api", (req, res) => {
  res.status(404).json({ error: "API route not found." });
});

if (fs.existsSync(FRONTEND_DIST_DIR)) {
  app.use(express.static(FRONTEND_DIST_DIR, { extensions: ["html"] }));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }

    if (req.path.startsWith("/api/")) {
      next();
      return;
    }

    if (!req.accepts("html") || !FRONTEND_INDEX_FILE) {
      next();
      return;
    }

    res.sendFile(FRONTEND_INDEX_FILE);
  });
}

app.listen(PORT, HOST, () => {
  const target = RENDER_EXTERNAL_URL || `http://${HOST}:${PORT}`;
  console.log(`Backend server is running on ${target}`);
});