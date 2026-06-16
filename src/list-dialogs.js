const { loadConfig } = require("./config");
const { createClient, startUserClient } = require("./client");
const { botApiStyleId, entityId, entityLabel } = require("./entities");

async function main() {
  const config = loadConfig({ requireChats: false });
  const client = createClient(config);

  await startUserClient(client, { showSession: !config.stringSession });

  const dialogs = await client.getDialogs({ limit: 200 });

  console.log("Daftar chat/channel yang terlihat oleh akun ini:");
  console.log("gramjs_id\tbot_api_id\tusername\ttype\tname");
  for (const dialog of dialogs) {
    const entity = dialog.entity;
    const id = entityId(entity);
    const botApiId = botApiStyleId(entity) || "-";
    const username = entity.username ? `@${entity.username}` : "-";
    const label = entityLabel(entity);
    const type = entity.className || "Unknown";

    console.log(`${id}\t${botApiId}\t${username}\t${type}\t${label}`);
  }

  await client.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
