const { utils } = require("telegram");

function entityLabel(entity) {
  return (
    entity.title ||
    [entity.firstName, entity.lastName].filter(Boolean).join(" ") ||
    entity.username ||
    "(tanpa nama)"
  );
}

function markedPeerId(entity) {
  return utils.getPeerId(entity).toString();
}

function entityId(entity) {
  return entity.id ? entity.id.toString() : "";
}

function botApiStyleId(entity) {
  const id = entityId(entity);

  if (!id || entity.className !== "Channel") {
    return "";
  }

  return `-100${id}`;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function entityMatchesRef(entity, ref) {
  const needle = normalize(ref);
  const username = normalize(entity.username);
  const usernameWithAt = username ? `@${username}` : "";
  const id = entityId(entity);
  const botApiId = botApiStyleId(entity);
  const label = normalize(entityLabel(entity));

  return [username, usernameWithAt, id, botApiId, label].some(
    (candidate) => candidate && normalize(candidate) === needle,
  );
}

async function resolveEntity(client, ref) {
  try {
    return await client.getEntity(ref);
  } catch (error) {
    const dialogs = await client.getDialogs({ limit: 500 });
    const found = dialogs.find((dialog) => entityMatchesRef(dialog.entity, ref));

    if (found) {
      return found.entity;
    }

    throw new Error(
      `Tidak bisa resolve chat "${ref}". Pastikan akun sudah join dan coba cek npm run dialogs. Detail: ${error.message}`,
    );
  }
}

module.exports = {
  botApiStyleId,
  entityId,
  entityLabel,
  markedPeerId,
  resolveEntity,
};
