const input = require("input");
const { TelegramClient } = require("telegram");
const { Logger } = require("telegram/extensions");
const { StringSession } = require("telegram/sessions");

function createClient(config) {
  const client = new TelegramClient(
    new StringSession(config.stringSession),
    config.apiId,
    config.apiHash,
    {
      baseLogger: new Logger("error"),
      connectionRetries: 5,
    },
  );

  if (client.setLogLevel) {
    client.setLogLevel("error");
  }

  return client;
}

async function startUserClient(client, { showSession = true } = {}) {
  await client.start({
    phoneNumber: async () => input.text("Nomor Telegram (+62...): "),
    password: async () => input.text("Password 2FA jika ada: "),
    phoneCode: async () => input.text("Kode login Telegram: "),
    onError: (error) => console.error("Login error:", error.message),
  });

  console.log("Login berhasil.");

  if (showSession) {
    console.log("Simpan TELEGRAM_STRING_SESSION ini ke .env:");
    console.log(client.session.save());
  }
}

module.exports = {
  createClient,
  startUserClient,
};
