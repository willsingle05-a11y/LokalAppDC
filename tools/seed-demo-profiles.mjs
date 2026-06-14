import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const SUPABASE_URL = (process.env.SUPABASE_URL || "https://iglzcjtklryapmcpyoam.supabase.co").replace(/\/$/, "");
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.DEMO_PROFILE_PASSWORD || "LokalDemo!2026";
const PROFILE_SOURCE = path.resolve("src/features/01-demo-profiles.js");

if (!SERVICE_ROLE_KEY) {
  throw new Error("Missing SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY. Set it before running this script.");
}

const source = fs.readFileSync(PROFILE_SOURCE, "utf8");
const demoProfileSeeds = vm.runInNewContext(`${source}\ndemoProfileSeeds;`, {});

async function supabaseRequest(pathname, options = {}) {
  const response = await fetch(`${SUPABASE_URL}${pathname}`, {
    ...options,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = data?.message || data?.msg || data?.error_description || data?.error || text || response.statusText;
    const error = new Error(`${response.status} ${message}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function listAuthUsers() {
  const users = [];
  for (let page = 1; page <= 10; page++) {
    const data = await supabaseRequest(`/auth/v1/admin/users?page=${page}&per_page=200`);
    const pageUsers = data?.users || [];
    users.push(...pageUsers);
    if (pageUsers.length < 200) break;
  }
  return users;
}

async function findExistingUser(email, phone) {
  const users = await listAuthUsers();
  return users.find(user => user.email === email || user.phone === phone);
}

async function createDemoUser(profile) {
  const email = `${profile.username}@demo.lokal.app`;
  try {
    return await supabaseRequest("/auth/v1/admin/users", {
      method: "POST",
      body: JSON.stringify({
        email,
        phone: profile.phone,
        password: PASSWORD,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
          username: profile.username,
          full_name: profile.fullName,
          birthdate: profile.birthdate,
          phone: profile.phone,
          demo_profile: true
        }
      })
    });
  } catch (error) {
    if (![400, 422].includes(error.status)) throw error;
    const existing = await findExistingUser(email, profile.phone);
    if (!existing) throw error;
    return existing;
  }
}

async function upsertProfiles(rows) {
  return supabaseRequest("/rest/v1/profiles?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(rows)
  });
}

const rows = [];
for (const profile of demoProfileSeeds) {
  const user = await createDemoUser(profile);
  rows.push({
    id: user.id,
    username: profile.username,
    full_name: profile.fullName,
    birthdate: profile.birthdate,
    phone: profile.phone,
    bio: profile.bio,
    home_city: "Washington, DC",
    is_demo: true
  });
  console.log(`Prepared ${profile.fullName} (${profile.username})`);
}

const upserted = await upsertProfiles(rows);
console.log(`Upserted ${upserted.length} demo profiles into Supabase.`);
