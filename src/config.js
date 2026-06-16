require("dotenv").config({ quiet: true });

function required(name) {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`Missing ${name}. Isi di .env atau environment variable.`);
  }

  return value.trim();
}

function optional(name, fallback = "") {
  return (process.env[name] || fallback).trim();
}

function numberEnv(name, fallback = 0) {
  const raw = optional(name, String(fallback));
  const parsed = Number(raw);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} harus berupa angka. Nilai saat ini: ${raw}`);
  }

  return parsed;
}

function loadConfig({ requireChats = true } = {}) {
  const relayMode = optional("RELAY_MODE", "forward").toLowerCase();

  if (!["forward", "copy"].includes(relayMode)) {
    throw new Error("RELAY_MODE harus forward atau copy.");
  }

  const config = {
    apiId: Number(required("TELEGRAM_API_ID")),
    apiHash: required("TELEGRAM_API_HASH"),
    stringSession: optional("TELEGRAM_STRING_SESSION"),
    sourceChat: optional("SOURCE_CHAT"),
    targetChat: optional("TARGET_CHAT"),
    relayMode,
    matchRegex: optional("MATCH_REGEX"),
    backfillLimit: numberEnv("BACKFILL_LIMIT", 0),
  };

  if (!Number.isInteger(config.apiId)) {
    throw new Error("TELEGRAM_API_ID harus berupa angka integer.");
  }

  if (requireChats) {
    if (!config.sourceChat) {
      throw new Error("Missing SOURCE_CHAT.");
    }

    if (!config.targetChat) {
      throw new Error("Missing TARGET_CHAT.");
    }
  }

  return config;
}

module.exports = {
  loadConfig,
};
