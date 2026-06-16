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

  const messages = await client.getMessages(source, { limit });
  const ordered = [...messages].reverse();

  for (const message of ordered) {
    if (!matches(message)) {
      continue;
    }

    const result = await relayMessage({ client, source, target, message, mode });

    if (result.status === "sent") {
      console.log(`Backfilled message ${message.id}`);
    } else if (result.reason === "forward-restricted") {
      console.warn(
        `Skipped message ${message.id}: source channel membatasi forward/protected content.`,
      );
    }
  }
}

async function main() {
  const config = loadConfig();
  const client = createClient(config);

  await startUserClient(client, { showSession: !config.stringSession });

  const source = await resolveEntity(client, config.sourceChat);
  const target = await resolveEntity(client, config.targetChat);
  const sourcePeerId = markedPeerId(source);
  const matches = createMatcher(config.matchRegex);

  console.log(`Source: ${config.sourceChat}`);
  console.log(`Source peer id: ${sourcePeerId}`);
  console.log(`Target: ${config.targetChat}`);
  console.log(`Mode: ${config.relayMode}`);

  await backfill({
    client,
    source,
    target,
    limit: config.backfillLimit,
    mode: config.relayMode,
    matches,
  });

  let chain = Promise.resolve();

  client.addEventHandler((event) => {
    chain = chain
      .then(async () => {
        const message = event.message;

        if (!matches(message)) {
          return;
        }

        const result = await relayMessage({
          client,
          source,
          target,
          message,
          mode: config.relayMode,
        });

        if (result.status !== "sent") {
          if (result.reason === "forward-restricted") {
            console.warn(
              `Skipped message ${message.id}: source channel membatasi forward/protected content.`,
            );
          }

          return;
        }

        const preview = messageText(message).replace(/\s+/g, " ").slice(0, 80);
        console.log(`Relayed message ${message.id}${preview ? `: ${preview}` : ""}`);
      })
      .catch((error) => {
        console.error("Gagal relay message:", error.message);
      });
  }, new NewMessage({ chats: [sourcePeerId], incoming: true }));

  console.log("Forwarder aktif. Tekan Ctrl+C untuk berhenti.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
