import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Helpers ──

const enc = new TextEncoder();

async function generateAckToken(id: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(id)));
  return Array.from(sig).map(b => b.toString(16).padStart(2, "0")).join("");
}

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const b64 = (str + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((a, b) => a + b.length, 0);
  const result = new Uint8Array(len);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function truncate(s: string, max = 300): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function endpointInfo(endpoint: string): { host: string; tail: string } {
  try {
    const url = new URL(endpoint);
    return { host: url.host, tail: endpoint.slice(-16) };
  } catch {
    return { host: "unknown", tail: endpoint.slice(-16) };
  }
}

// ── VAPID JWT signing (ES256) ──

function derToRaw(der: Uint8Array): Uint8Array {
  const raw = new Uint8Array(64);
  let offset = 2;
  if (der[1] & 0x80) offset += (der[1] & 0x7f);
  const rLen = der[offset + 1];
  offset += 2;
  const rStart = rLen > 32 ? offset + (rLen - 32) : offset;
  const rDest = rLen < 32 ? 32 - rLen : 0;
  raw.set(der.slice(rStart, offset + rLen), rDest);
  offset += rLen;
  const sLen = der[offset + 1];
  offset += 2;
  const sStart = sLen > 32 ? offset + (sLen - 32) : offset;
  const sDest = sLen < 32 ? 32 + (32 - sLen) : 32;
  raw.set(der.slice(sStart, offset + sLen), sDest);
  return raw;
}

async function generateVapidAuth(
  endpoint: string,
  vapidSubject: string,
  publicKey: string,
  privateKey: string
) {
  const urlObj = new URL(endpoint);
  const audience = `${urlObj.protocol}//${urlObj.host}`;
  const now = Math.floor(Date.now() / 1000);
  const header = { typ: "JWT", alg: "ES256" };
  const payload = { aud: audience, exp: now + 12 * 3600, sub: vapidSubject };

  const headerB64 = b64url(enc.encode(JSON.stringify(header)));
  const payloadB64 = b64url(enc.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const pubRaw = b64urlDecode(publicKey);
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    d: privateKey,
    ext: true,
  };
  if (pubRaw.length === 65 && pubRaw[0] === 0x04) {
    jwk.x = b64url(pubRaw.slice(1, 33));
    jwk.y = b64url(pubRaw.slice(33, 65));
  }

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    enc.encode(unsignedToken)
  );

  const sigBytes = new Uint8Array(signature);
  const rawSig = sigBytes.length === 64 ? sigBytes : derToRaw(sigBytes);
  const token = `${unsignedToken}.${b64url(rawSig)}`;
  return { token };
}

// ── Web Push Payload Encryption (RFC 8291 — aes128gcm) ──

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const saltKey = await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", saltKey, ikm));
  const prkKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const infoWithCounter = concat(info, new Uint8Array([1]));
  const okm = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, infoWithCounter));
  return okm.slice(0, length);
}

async function encryptPayload(
  plaintext: string,
  p256dhBase64: string,
  authBase64: string
): Promise<{ body: Uint8Array }> {
  const userPublicKeyBytes = b64urlDecode(p256dhBase64);
  const userAuth = b64urlDecode(authBase64);

  // Generate ephemeral ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  const subscriberKey = await crypto.subtle.importKey(
    "raw",
    userPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: subscriberKey },
      localKeyPair.privateKey,
      256
    )
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // RFC 8291: IKM uses "WebPush: info\0" + ua_public + as_public
  const ikmInfo = concat(
    enc.encode("WebPush: info\0"),
    userPublicKeyBytes,
    localPublicKeyRaw
  );
  const ikm = await hkdf(userAuth, sharedSecret, ikmInfo, 32);

  // CEK: "Content-Encoding: aes128gcm\0"
  const cekInfo = enc.encode("Content-Encoding: aes128gcm\0");
  const contentEncryptionKey = await hkdf(salt, ikm, cekInfo, 16);

  // Nonce: "Content-Encoding: nonce\0"
  const nonceInfo = enc.encode("Content-Encoding: nonce\0");
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  // aes128gcm padding: plaintext + delimiter 0x02
  const plaintextBytes = enc.encode(plaintext);
  const padded = new Uint8Array(plaintextBytes.length + 1);
  padded.set(plaintextBytes, 0);
  padded[plaintextBytes.length] = 0x02; // delimiter

  const aesKey = await crypto.subtle.importKey(
    "raw",
    contentEncryptionKey,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      aesKey,
      padded
    )
  );

  // aes128gcm body: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const rs = new Uint8Array(4);
  rs[0] = 0; rs[1] = 0; rs[2] = 0x10; rs[3] = 0; // 4096
  const idlen = new Uint8Array([localPublicKeyRaw.length]); // 65

  const requestBody = concat(salt, rs, idlen, localPublicKeyRaw, encrypted);
  return { body: requestBody };
}

// ── Notification template helpers ──

function replacePlaceholders(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(key, value);
  }
  return result;
}

// ── Main handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth guard: only allow calls with the service role key
  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const executionId = crypto.randomUUID().slice(0, 8);
  const log = (level: string, msg: string, data?: Record<string, unknown>) => {
    const entry = { exec: executionId, level, msg, ...data };
    if (level === "error") {
      console.error(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // A) Validate VAPID keys exist
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";

  if (!vapidPublicKey || !vapidPrivateKey) {
    log("error", "missing_vapid_env", { hasPublic: !!vapidPublicKey, hasPrivate: !!vapidPrivateKey });
    return new Response(
      JSON.stringify({ error: "VAPID keys not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { event_id } = await req.json();
    if (!event_id) throw new Error("event_id required");

    // Load event
    const { data: event, error: evError } = await supabase
      .from("events_queue")
      .select("*")
      .eq("id", event_id)
      .single();
    if (evError || !event) throw new Error(`Event not found: ${evError?.message}`);

    // Load all required data in parallel
    const [
      { data: templates },
      { data: userPoints },
      { data: leaderboard },
      { data: notifSettings },
      { data: subscriptions },
      { data: teams },
      { data: existingOutbox },
    ] = await Promise.all([
      supabase.from("notification_templates").select("*").eq("enabled", true),
      supabase.from("event_user_points").select("*").eq("event_id", event_id),
      supabase.from("leaderboard_snapshot").select("*").eq("event_id", event_id),
      supabase.from("user_notification_settings").select("user_id").eq("enabled", true),
      supabase.from("push_subscriptions").select("*").eq("active", true),
      supabase.from("teams").select("id, name, flag"),
      supabase.from("notification_outbox").select("id, user_id, type").eq("event_id", event_id),
    ]);

    const templateMap = new Map((templates || []).map((t: any) => [t.key, t]));
    const rankMap = new Map((leaderboard || []).map((l: any) => [l.user_id, l.rank]));
    const enabledUserIds = new Set((notifSettings || []).map((s: any) => s.user_id));
    const teamMap = new Map((teams || []).map((t: any) => [t.id, t]));

    // Build set of already-processed user+type combos for idempotency
    const alreadySent = new Set(
      (existingOutbox || []).map((o: any) => `${o.user_id}::${o.type}`)
    );

    const subsByUser = new Map<string, any[]>();
    (subscriptions || []).forEach((sub: any) => {
      if (!enabledUserIds.has(sub.user_id)) return;
      const arr = subsByUser.get(sub.user_id) || [];
      arr.push(sub);
      subsByUser.set(sub.user_id, arr);
    });

    log("info", "execution_start", {
      event_id,
      event_type: event.type,
      total_user_points: (userPoints || []).length,
      enabled_users: enabledUserIds.size,
      total_subscriptions: (subscriptions || []).length,
      eligible_users_with_subs: subsByUser.size,
      already_sent_count: alreadySent.size,
      template_keys: (templates || []).map((t: any) => t.key),
    });

    const payload = event.payload || {};
    let sentCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    let duplicateCount = 0;

    // ── Handle admin_broadcast: send directly to all enabled users ──
    if (event.type === "admin_broadcast") {
      const broadcastTitle = payload.title || "Notificación";
      const broadcastBody = payload.body || "";

      for (const [userId, userSubs] of subsByUser.entries()) {
        const dedupeKey = `${userId}::admin_broadcast`;
        if (alreadySent.has(dedupeKey)) {
          duplicateCount++;
          continue;
        }

        // Insert outbox
        const { data: outboxRow, error: outboxError } = await supabase
          .from("notification_outbox")
          .insert({
            event_id: event.id,
            user_id: userId,
            type: "admin_broadcast",
            title: broadcastTitle,
            body: broadcastBody,
            status: "queued",
          })
          .select("id")
          .single();

        if (outboxError || !outboxRow) {
          log("error", "outbox_insert_failed", { user_id: userId, error: outboxError?.message });
          continue;
        }

        const outboxId = outboxRow.id;
        const ackToken = await generateAckToken(outboxId, serviceRoleKey);
        const ackUrl = `${supabaseUrl}/functions/v1/ack-push-delivery?id=${outboxId}&token=${ackToken}`;
        let deliveredToAtLeastOne = false;
        const deliveryErrors: string[] = [];

        for (const sub of userSubs) {
          const { host, tail } = endpointInfo(sub.endpoint);
          const pushStart = Date.now();
          try {
            const { token } = await generateVapidAuth(sub.endpoint, vapidSubject, vapidPublicKey, vapidPrivateKey);
            const pushPayloadStr = JSON.stringify({
              title: broadcastTitle,
              body: broadcastBody,
              url: "/dashboard",
              ack_url: ackUrl,
            });
            const { body: requestBody } = await encryptPayload(pushPayloadStr, sub.p256dh, sub.auth);
            const response = await fetch(sub.endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/octet-stream",
                "Content-Encoding": "aes128gcm",
                Authorization: `vapid t=${token}, k=${vapidPublicKey}`,
                TTL: "86400",
              },
              body: requestBody,
            });
            const pushStatus = response.status;
            if (pushStatus === 201 || pushStatus === 202) {
              deliveredToAtLeastOne = true;
            } else if (pushStatus === 404 || pushStatus === 410) {
              await supabase.from("push_subscriptions").update({ active: false, invalidated_at: new Date().toISOString(), invalid_reason: `push_service_${pushStatus}` }).eq("id", sub.id);
              deliveryErrors.push(`expired(${pushStatus})`);
            } else {
              deliveryErrors.push(`http_${pushStatus}`);
            }
          } catch (pushErr) {
            deliveryErrors.push(`exception: ${truncate(String(pushErr), 100)}`);
          }
        }

        if (deliveredToAtLeastOne) {
          await supabase.from("notification_outbox").update({ status: "sent", sent_at: new Date().toISOString(), error: null }).eq("id", outboxId);
          sentCount++;
        } else {
          failCount++;
          await supabase.from("notification_outbox").update({ status: "failed", error: deliveryErrors.join(" | ").slice(0, 1000) || "no_delivery" }).eq("id", outboxId);
        }
      }

      log("info", "broadcast_end", { event_id, sent: sentCount, failed: failCount, duplicates: duplicateCount });
      return new Response(
        JSON.stringify({ success: true, sent: sentCount, failed: failCount, skipped: skippedCount, duplicates: duplicateCount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    for (const up of (userPoints || [])) {
      const hasNotifEnabled = enabledUserIds.has(up.user_id);
      const hasSubs = subsByUser.has(up.user_id);
      if (!hasNotifEnabled || !hasSubs) {
        skippedCount++;
        continue;
      }

      const rank = rankMap.get(up.user_id) || 0;
      const details = up.details || {};

      let title = "";
      let body = "";
      let notifType = event.type;

      // ── Build notification content from templates ──
      if (event.type === "match_result") {
        const tpl = templateMap.get("match_result_base");
        if (!tpl) { log("warn", "missing_template", { key: "match_result_base" }); continue; }
        const homeTeam = teamMap.get(payload.home_team_id);
        const awayTeam = teamMap.get(payload.away_team_id);
        const matchPoints = details.match_points ?? 0;
        const vars: Record<string, string> = {
          "{HOME_TEAM}": homeTeam?.name || payload.home_team_id || "",
          "{AWAY_TEAM}": awayTeam?.name || payload.away_team_id || "",
          "{REAL_SCORE_HOME}": String(payload.home_goals ?? ""),
          "{REAL_SCORE_AWAY}": String(payload.away_goals ?? ""),
          "{USER_PRED_HOME}": String(details.user_pred_home ?? "?"),
          "{USER_PRED_AWAY}": String(details.user_pred_away ?? "?"),
          "{POINTS}": String(matchPoints),
          "{TOTAL_POINTS}": String(up.points),
          "{RANK}": String(rank),
        };
        title = replacePlaceholders(tpl.title, vars);
        body = replacePlaceholders(tpl.body, vars);
        if (matchPoints >= 10) {
          const suffix = templateMap.get("match_suffix_gt10");
          if (suffix) body += suffix.body;
        } else if (matchPoints < 3) {
          const suffix = templateMap.get("match_suffix_lt3");
          if (suffix) body += suffix.body;
        }
      } else if (event.type === "knockout_result") {
        const team = teamMap.get(payload.team_id);
        const knockoutPoints = details.knockout_points ?? 0;
        const vars: Record<string, string> = {
          "{ROUND_NAME}": payload.round_name || "",
          "{TEAM}": team?.name || payload.team_name || payload.team_id || "",
          "{POINTS}": String(knockoutPoints),
          "{TOTAL_POINTS}": String(up.points),
          "{RANK}": String(rank),
        };
        const isCorrect = details.knockout_correct === true;
        const tplKey = isCorrect ? "knockout_correct" : "knockout_wrong";
        const tpl = templateMap.get(tplKey);
        if (!tpl) { log("warn", "missing_template", { key: tplKey }); continue; }
        title = replacePlaceholders(tpl.title, vars);
        body = replacePlaceholders(tpl.body, vars);
      } else if (event.type === "award_result") {
        const tpl = templateMap.get("award_result");
        if (!tpl) { log("warn", "missing_template", { key: "award_result" }); continue; }
        const vars: Record<string, string> = {
          "{AWARD_NAME}": payload.award_name || "",
          "{WINNER}": payload.winner || "",
          "{USER_PICK}": details.user_pick || "?",
          "{POINTS}": String(up.points),
          "{TOTAL_POINTS}": String(up.points),
          "{RANK}": String(rank),
        };
        title = replacePlaceholders(tpl.title, vars);
        body = replacePlaceholders(tpl.body, vars);
      } else {
        log("warn", "unknown_event_type", { type: event.type });
        continue;
      }

      // ── Idempotency check ──
      const dedupeKey = `${up.user_id}::${notifType}`;
      if (alreadySent.has(dedupeKey)) {
        duplicateCount++;
        log("info", "skipped_duplicate", { user_id: up.user_id, type: notifType });
        continue;
      }

      // ── Insert outbox as "queued" and get the ID back ──
      const { data: outboxRow, error: outboxError } = await supabase
        .from("notification_outbox")
        .insert({
          event_id: event.id,
          user_id: up.user_id,
          type: notifType,
          title,
          body,
          status: "queued",
        })
        .select("id")
        .single();

      if (outboxError || !outboxRow) {
        log("error", "outbox_insert_failed", { user_id: up.user_id, error: outboxError?.message });
        continue;
      }

      const outboxId = outboxRow.id;
      const ackToken = await generateAckToken(outboxId, serviceRoleKey);
      const ackUrl = `${supabaseUrl}/functions/v1/ack-push-delivery?id=${outboxId}&token=${ackToken}`;
      log("info", "outbox_inserted", { user_id: up.user_id, outbox_id: outboxId, title: truncate(title, 80) });

      // ── Send push to all devices ──
      const userSubs = subsByUser.get(up.user_id) || [];
      let deliveredToAtLeastOne = false;
      const deliveryErrors: string[] = [];

      for (const sub of userSubs) {
        const { host, tail } = endpointInfo(sub.endpoint);
        const pushStart = Date.now();
        let pushStatus = 0;
        let pushResponseBody = "";

        try {
          const { token } = await generateVapidAuth(sub.endpoint, vapidSubject, vapidPublicKey, vapidPrivateKey);

          // Include ack_url in the push payload so the SW can report delivery
          const pushPayloadStr = JSON.stringify({
            title,
            body,
            url: "/clasificacion",
            ack_url: ackUrl,
          });

          const { body: requestBody } = await encryptPayload(
            pushPayloadStr,
            sub.p256dh,
            sub.auth
          );

          // RFC 8291 aes128gcm — no Crypto-Key or Encryption headers needed
          const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              "Content-Encoding": "aes128gcm",
              Authorization: `vapid t=${token}, k=${vapidPublicKey}`,
              TTL: "86400",
            },
            body: requestBody,
          });

          pushStatus = response.status;
          pushResponseBody = await response.text();
          const durationMs = Date.now() - pushStart;

          if (pushStatus === 201 || pushStatus === 202) {
            deliveredToAtLeastOne = true;
            log("info", "push_accepted", {
              sub_id: sub.id,
              endpoint_host: host,
              endpoint_tail: tail,
              status: pushStatus,
              duration_ms: durationMs,
            });
          } else if (pushStatus === 404 || pushStatus === 410) {
            await supabase
              .from("push_subscriptions")
              .update({
                active: false,
                invalidated_at: new Date().toISOString(),
                invalid_reason: `push_service_${pushStatus}`,
              })
              .eq("id", sub.id);
            deliveryErrors.push(`expired(${pushStatus})`);
            log("warn", "push_expired", {
              sub_id: sub.id,
              endpoint_host: host,
              endpoint_tail: tail,
              status: pushStatus,
              response_body: truncate(pushResponseBody),
              duration_ms: durationMs,
            });
          } else if (pushStatus === 401 || pushStatus === 403) {
            deliveryErrors.push(`vapid_rejected(${pushStatus})`);
            log("error", "push_vapid_rejected", {
              sub_id: sub.id,
              endpoint_host: host,
              endpoint_tail: tail,
              status: pushStatus,
              response_body: truncate(pushResponseBody),
              duration_ms: durationMs,
            });
          } else {
            deliveryErrors.push(`http_${pushStatus}`);
            log("error", "push_failed", {
              sub_id: sub.id,
              endpoint_host: host,
              endpoint_tail: tail,
              status: pushStatus,
              response_body: truncate(pushResponseBody),
              duration_ms: durationMs,
            });
          }
        } catch (pushErr) {
          const durationMs = Date.now() - pushStart;
          const errMsg = String(pushErr);
          deliveryErrors.push(`exception: ${truncate(errMsg, 100)}`);
          log("error", "push_exception", {
            sub_id: sub.id,
            endpoint_host: host,
            endpoint_tail: tail,
            error: truncate(errMsg),
            duration_ms: durationMs,
          });
        }
      }

      // ── Update outbox status based on delivery result ──
      if (deliveredToAtLeastOne) {
        await supabase
          .from("notification_outbox")
          .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
          .eq("id", outboxId);
        sentCount++;
        log("info", "outbox_sent", { user_id: up.user_id, outbox_id: outboxId });
      } else {
        failCount++;
        const errorSummary = deliveryErrors.join(" | ").slice(0, 1000) || "no_delivery";
        await supabase
          .from("notification_outbox")
          .update({ status: "failed", error: errorSummary })
          .eq("id", outboxId);
        log("error", "outbox_failed", { user_id: up.user_id, outbox_id: outboxId, errors: errorSummary });
      }
    }

    log("info", "execution_end", {
      event_id,
      sent: sentCount,
      failed: failCount,
      skipped_ineligible: skippedCount,
      skipped_duplicate: duplicateCount,
    });

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, failed: failCount, skipped: skippedCount, duplicates: duplicateCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    log("error", "fatal_error", { error: String(error) });
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
