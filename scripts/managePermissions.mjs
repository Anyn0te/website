#!/usr/bin/env node

import { promises as fs } from "fs";
import path from "path";

const VALID_ROLES = ["admin", "moderator", "user", "anonymous"];
const projectRoot = process.cwd();
const usersDir = path.join(projectRoot, "storage", "users");

const usage = () => {
  console.log("Usage:");
  console.log("  npm run permission <role> <username>");
  console.log("  npm run permission list <username>");
  console.log("  npm run permission -- <role> <username>");
  console.log("");
  console.log("Roles:");
  console.log("  admin     → full access (manage notes/comments, view encrypted threads)");
  console.log("  moderator → moderate notes/comments, view encrypted threads");
  console.log("  user      → default access");
  console.log("  anonymous → guest-level access (no moderation)");
};

const normalizeUsername = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().replace(/^@+/, "");
  return trimmed.length > 0 ? trimmed.toLowerCase() : null;
};

const loadAllUserRecords = async () => {
  let entries;
  try {
    entries = await fs.readdir(usersDir, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") {
      throw new Error("Users directory not found. Has any user signed in yet?");
    }
    throw error;
  }

  const records = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }

    const absolute = path.join(usersDir, entry.name);
    try {
      const contents = await fs.readFile(absolute, "utf-8");
      const record = JSON.parse(contents);
      if (record && typeof record.userId === "string") {
        records.push({ path: absolute, record });
      }
    } catch (error) {
      console.warn(`Skipping ${entry.name}: ${error.message}`);
    }
  }

  return records;
};

const findUser = async (identifier) => {
  const records = await loadAllUserRecords();

  const normalizedUsername = normalizeUsername(identifier);
  if (normalizedUsername) {
    const byUsername = records.find((candidate) => {
      const storedUsername =
        typeof candidate.record.username === "string"
          ? candidate.record.username.trim().toLowerCase()
          : null;
      return storedUsername === normalizedUsername;
    });
    if (byUsername) {
      return byUsername;
    }
  }

  const byId = records.find((candidate) => candidate.record.userId === identifier);
  return byId ?? null;
};

const saveUserRecord = async (filePath, record) => {
  const serialized = JSON.stringify(record, null, 2);
  await fs.writeFile(filePath, serialized, "utf-8");
};

const resolveArguments = () => {
  const [, , action, identifier] = process.argv;
  if (action && identifier) {
    return { action, identifier };
  }

  const raw = process.env.npm_config_argv;
  if (!raw) {
    return { action, identifier };
  }

  try {
    const parsed = JSON.parse(raw);
    const original = Array.isArray(parsed?.original) ? parsed.original : [];
    const index = original.indexOf("permission");
    if (index !== -1) {
      return {
        action: original[index + 1],
        identifier: original[index + 2],
      };
    }
  } catch {
    // ignore parsing issues
  }

  return { action, identifier };
};

const main = async () => {
  const { action: rawAction, identifier } = resolveArguments();

  if (!rawAction || !identifier) {
    usage();
    process.exitCode = 1;
    return;
  }

  if (rawAction === "list") {
    const targetUser = await findUser(identifier);
    if (!targetUser) {
      console.error(`No account found for "${identifier}".`);
      process.exitCode = 1;
      return;
    }
    const { record } = targetUser;
    const role = typeof record.role === "string" ? record.role : "user";
    console.log(`${record.username ?? record.userId}: ${role}`);
    return;
  }

  const normalizedRole = rawAction.trim().toLowerCase();
  if (!VALID_ROLES.includes(normalizedRole)) {
    console.error(`Unknown role: ${rawAction}`);
    usage();
    process.exitCode = 1;
    return;
  }

  const targetUser = await findUser(identifier);
  if (!targetUser) {
    console.error(`No account found for "${identifier}".`);
    process.exitCode = 1;
    return;
  }

  const { path: filePath, record } = targetUser;

  if (!record.userId || record.userId.startsWith("guest-")) {
    console.error("Cannot assign roles to guest accounts. Ask the user to sign in.");
    process.exitCode = 1;
    return;
  }

  const previousRole = typeof record.role === "string" ? record.role : "user";
  record.role = normalizedRole;
  record.updatedAt = new Date().toISOString();

  await saveUserRecord(filePath, record);
  console.log(
    `Updated ${record.username ?? record.userId} from role "${previousRole}" to "${normalizedRole}".`,
  );
};

main().catch((error) => {
  console.error("Role assignment failed:", error);
  process.exitCode = 1;
});
