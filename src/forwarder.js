const { NewMessage } = require("telegram/events");
const { loadConfig } = require("./config");
const { createClient, startUserClient } = require("./client");
const { markedPeerId, resolveEntity } = require("./entities");

function createMatcher(pattern) {
  if (!pattern) {
    return () => true;
  }

  const regex = new RegExp(pattern, "i");
  return (message) => regex.test(message.text || message.message || "");
}

function messageText(message) {
  return message.text || message.message || "";
}

function isForwardRestricted(error) {
  const text = `${error.errorMessage || ""} ${error.message || ""}`;
  return text.includes("CHAT_FORWARDS_RESTRICTED");
}

async function relayMessage({ client, source, target, message, mode }) {
  if (!message || message.className === "MessageService") {
    return { status: "skipped", reason: "service-message" };
  }

  try {
    if (mode === "copy") {
      await client.sendMessage(target, { message });
      return { status: "sent" };
    }

    await client.forwardMessages(target, {
      messages: [message.id],
      fromPeer: source,
    });

    return { status: "sent" };
  } catch (error) {
    if (isForwardRestricted(error)) {
      return { status: "skipped", reason: "forward-restricted" };
    }

    throw error;
  }
}

async function backfill({ client, source, target, limit, mode, matches }) {
  if (limit <= 0) {
    return;
  }

  const messages = await client.getMessages(source.entity, { limit });
  const ordered = [...messages].reverse();

  for (const message of ordered) {
    if (!matches(message)) {
      continue;
    }

    const result = await relayMessage({
      client,
      source: source.entity,
      target,
      message,
      mode,
    });

    if (result.status === "sent") {
      console.log(`Backfilled ${source.ref} message ${message.id}`);
    } else if (result.reason === "forward-restricted") {
      console.warn(
        `Skipped ${source.ref} message ${message.id}: source channel membatasi forward/protected content.`,
      );
    }
  }
}

async function main() {
  const config = loadConfig();
  const client = createClient(config);

  await startUserClient(client, { showSession: !config.stringSession });

  const sources = [];
  const target = await resolveEntity(client, config.targetChat);
  const matches = createMatcher(config.matchRegex);

  for (const ref of config.sourceChats) {
    const entity = await resolveEntity(client, ref);
    const peerId = markedPeerId(entity);

    if (sources.some((source) => source.peerId === peerId)) {
      console.warn(`Source duplikat diabaikan: ${ref} (${peerId})`);
      continue;
    }

    sources.push({ ref, entity, peerId });
  }

  const sourceByPeerId = new Map(sources.map((source) => [source.peerId, source]));
  const sourcePeerIds = sources.map((source) => source.peerId);

  console.log(`Sources: ${sources.length}`);
  for (const source of sources) {
    console.log(`- ${source.ref} (${source.peerId})`);
  }
  console.log(`Target: ${config.targetChat}`);
  console.log(`Mode: ${config.relayMode}`);

  for (const source of sources) {
    await backfill({
      client,
      source,
      target,
      limit: config.backfillLimit,
      mode: config.relayMode,
      matches,
    });
  }

  let chain = Promise.resolve();

  client.addEventHandler((event) => {
    chain = chain
      .then(async () => {
        const message = event.message;
        const chatId = event.chatId ? event.chatId.toString() : "";
        const source = sourceByPeerId.get(chatId);

        if (!source) {
          console.warn(`Pesan dari source tidak dikenal diabaikan: ${chatId || "(tanpa chat id)"}`);
          return;
        }

        if (!matches(message)) {
          return;
        }

        const result = await relayMessage({
          client,
          source: source.entity,
          target,
          message,
          mode: config.relayMode,
        });

        if (result.status !== "sent") {
          if (result.reason === "forward-restricted") {
            console.warn(
              `Skipped ${source.ref} message ${message.id}: source channel membatasi forward/protected content.`,
            );
          }

          return;
        }

        const preview = messageText(message).replace(/\s+/g, " ").slice(0, 80);
        console.log(`Relayed ${source.ref} message ${message.id}${preview ? `: ${preview}` : ""}`);
      })
      .catch((error) => {
        console.error("Gagal relay message:", error.message);
      });
  }, new NewMessage({ chats: sourcePeerIds, incoming: true }));

  console.log("Forwarder aktif. Tekan Ctrl+C untuk berhenti.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
