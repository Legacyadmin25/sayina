/**
 * Cache Manager Utility
 * Simple in-memory cache with TTL support.
 * Falls back gracefully if Redis is unavailable.
 */

const cache = new Map();

const get = async (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

const set = async (key, value, ttlSeconds = 300) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
  return true;
};

const del = async (key) => {
  cache.delete(key);
  return true;
};

const flush = async () => {
  cache.clear();
  return true;
};

module.exports = { get, set, del, flush };
