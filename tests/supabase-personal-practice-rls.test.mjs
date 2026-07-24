import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

function loadLocalEnv() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].trim().replace(/^"(.*)"$/, "$1");
    }
  } catch {
    // CI can provide the same values through environment variables.
  }
}

loadLocalEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY;

test("personal practice RLS isolates two authenticated users", {
  skip: !url || !publicKey || !serviceKey
    ? "Supabase integration credentials are not configured"
    : false,
  timeout: 30_000,
}, async () => {
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const marker = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const password = `Eq-test-${crypto.randomUUID()}!`;
  const users = [];

  try {
    for (const label of ["a", "b"]) {
      const email = `eq-rls-${label}-${marker}@example.invalid`;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      assert.ifError(error);
      assert.ok(data.user);
      users.push({ id: data.user.id, email });
    }

    const clients = [];
    for (const user of users) {
      const client = createClient(url, publicKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error } = await client.auth.signInWithPassword({
        email: user.email,
        password,
      });
      assert.ifError(error);
      clients.push(client);
    }

    const journeyA = crypto.randomUUID();
    const journeyB = crypto.randomUUID();
    const targetSkillId = "idea-entry.clear-contribution.v1";
    const { error: insertAError } = await clients[0]
      .from("personal_practice_journeys")
      .insert({
        id: journeyA,
        user_id: users[0].id,
        target_skill_id: targetSkillId,
        current_stage: "guided",
      });
    assert.ifError(insertAError);
    const { error: insertBError } = await clients[1]
      .from("personal_practice_journeys")
      .insert({
        id: journeyB,
        user_id: users[1].id,
        target_skill_id: targetSkillId,
        current_stage: "prompted",
      });
    assert.ifError(insertBError);

    const { data: bReadsA, error: bReadError } = await clients[1]
      .from("personal_practice_journeys")
      .select("id")
      .eq("id", journeyA);
    assert.ifError(bReadError);
    assert.deepEqual(bReadsA, []);

    const { data: aReadsB, error: aReadError } = await clients[0]
      .from("personal_practice_journeys")
      .select("id")
      .eq("id", journeyB);
    assert.ifError(aReadError);
    assert.deepEqual(aReadsB, []);

    const { data: bUpdatesA, error: bUpdateError } = await clients[1]
      .from("personal_practice_journeys")
      .update({ current_stage: "connected-rehearsal" })
      .eq("id", journeyA)
      .select("id");
    assert.ifError(bUpdateError);
    assert.deepEqual(bUpdatesA, []);

    const { data: ownerStillSeesA, error: ownerReadError } = await clients[0]
      .from("personal_practice_journeys")
      .select("current_stage")
      .eq("id", journeyA)
      .single();
    assert.ifError(ownerReadError);
    assert.equal(ownerStillSeesA.current_stage, "guided");

    const { error: crossOwnerRepairError } = await clients[1]
      .from("past_event_repairs")
      .insert({
        id: journeyA,
        user_id: users[1].id,
        target_skill_id: targetSkillId,
        moments: ["test"],
      });
    assert.ok(crossOwnerRepairError, "composite ownership foreign key must reject cross-owner repair");
  } finally {
    await Promise.all(users.map((user) => admin.auth.admin.deleteUser(user.id)));
  }
});
