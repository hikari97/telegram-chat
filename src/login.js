const { loadConfig } = require("./config");
const { createClient, startUserClient } = require("./client");

async function main() {
  const config = loadConfig({ requireChats: false });
  const client = createClient(config);

  await startUserClient(client, { showSession: true });
  await client.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
