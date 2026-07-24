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

    const { error: mediaAttemptError } = await clients[0]
      .from("personal_practice_attempts")
      .insert({
        id: crypto.randomUUID(),
        journey_id: journeyA,
        user_id: users[0].id,
        target_skill_id: targetSkillId,
        variation_id: "rls-media-variant",
        variation_seed: "rls-media-seed",
        stage: "guided",
        changed_dimensions: ["environment"],
        anxiety_before: 4,
        anxiety_after: 3,
        completed: true,
        safe_finished: false,
        used_hint: false,
        decision: "repeat",
        renderer: "image_audio",
        media_asset_id: "ideation-event-calm-v1",
        media_skipped: false,
      });
    assert.ifError(mediaAttemptError);

    const { error: bridgeInsertError } = await clients[0]
      .from("real_life_bridges")
      .insert({
        id: crypto.randomUUID(),
        journey_id: journeyA,
        user_id: users[0].id,
        status: "accepted",
        offered_at: new Date().toISOString(),
        responded_at: new Date().toISOString(),
      });
    assert.ifError(bridgeInsertError);
    const { data: bReadsBridge, error: bReadsBridgeError } = await clients[1]
      .from("real_life_bridges")
      .select("id")
      .eq("journey_id", journeyA);
    assert.ifError(bReadsBridgeError);
    assert.deepEqual(bReadsBridge, []);

    const connectedId = crypto.randomUUID();
    const { error: connectedInsertError } = await clients[0]
      .from("connected_rehearsals")
      .insert({
        id: connectedId,
        journey_id: journeyA,
        user_id: users[0].id,
        status: "paused",
        current_moment: 2,
        completed_moment_ids: ["arrive", "listen"],
        intensity_before: 5,
        intensity_after: 4,
        used_recovery: false,
        pause_count: 1,
        elapsed_seconds: 60,
        started_at: new Date().toISOString(),
      });
    assert.ifError(connectedInsertError);
    const { data: bReadsConnected, error: bReadsConnectedError } = await clients[1]
      .from("connected_rehearsals")
      .select("id")
      .eq("id", connectedId);
    assert.ifError(bReadsConnectedError);
    assert.deepEqual(bReadsConnected, []);

    const { error: routeInsertError } = await clients[0]
      .from("today_practice_routes")
      .insert({
        user_id: users[0].id,
        readiness: {
          accumulatedIntensity: 6,
          upcomingEvent: true,
          availableEnergy: 5,
        },
        recommended_route: "past_repair",
        selected_route: null,
      });
    assert.ifError(routeInsertError);
    const { data: bReadsRoute, error: bReadsRouteError } = await clients[1]
      .from("today_practice_routes")
      .select("user_id")
      .eq("user_id", users[0].id);
    assert.ifError(bReadsRouteError);
    assert.deepEqual(bReadsRoute, []);

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
