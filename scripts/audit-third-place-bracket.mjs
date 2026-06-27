import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const GROUPS = "ABCDEFGHIJKL".split("");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const allocationSource = readFileSync(
  path.join(__dirname, "..", "src", "lib", "thirdPlaceAllocations.ts"),
  "utf8"
);

const allocationBody = allocationSource.match(
  /export const THIRD_PLACE_ALLOCATIONS:[\s\S]*?= \{([\s\S]*?)\};/
)?.[1];

if (!allocationBody) {
  throw new Error("Could not read THIRD_PLACE_ALLOCATIONS from source file.");
}

const THIRD_PLACE_ALLOCATIONS = Function(`return ({${allocationBody}});`)();

function psqlJson(query) {
  const databaseUrl = process.env.SUPABASE_DB_URL;
  if (!databaseUrl) {
    throw new Error("Missing SUPABASE_DB_URL.");
  }

  const psqlBin = process.env.PSQL_BIN || "psql";
  const output = execFileSync(
    psqlBin,
    [databaseUrl, "--no-align", "--tuples-only", "--quiet", "--command", query],
    { encoding: "utf8", maxBuffer: 1024 * 1024 * 20 }
  ).trim();

  return output ? JSON.parse(output) : [];
}

function psqlExec(query) {
  const databaseUrl = process.env.SUPABASE_DB_URL;
  if (!databaseUrl) {
    throw new Error("Missing SUPABASE_DB_URL.");
  }

  const psqlBin = process.env.PSQL_BIN || "psql";
  execFileSync(psqlBin, [databaseUrl, "--set", "ON_ERROR_STOP=1", "--command", query], {
    encoding: "utf8",
    stdio: "inherit",
  });
}

const groupMatches = psqlJson(`
  SELECT COALESCE(json_agg(row_to_json(data) ORDER BY data.group_id, data.match_date, data.id), '[]'::json)
  FROM (
    SELECT
      m.id,
      m.group_id,
      m.match_date,
      m.status,
      m.home_score,
      m.away_score,
      m.home_team_id,
      m.away_team_id,
      ht.name AS home_team,
      at.name AS away_team
    FROM public.matches m
    LEFT JOIN public.teams ht ON ht.id = m.home_team_id
    LEFT JOIN public.teams at ON at.id = m.away_team_id
    WHERE m.match_type = 'group'
  ) data;
`);

const currentRoundOf32 = psqlJson(`
  SELECT COALESCE(json_agg(row_to_json(data) ORDER BY data.sort_order), '[]'::json)
  FROM (
    SELECT
      m.id,
      regexp_replace(m.id, '^R32_', '')::int AS sort_order,
      m.home_team_id,
      m.away_team_id,
      ht.name AS home_team,
      at.name AS away_team
    FROM public.matches m
    LEFT JOIN public.teams ht ON ht.id = m.home_team_id
    LEFT JOIN public.teams at ON at.id = m.away_team_id
    WHERE m.id ~ '^R32_[0-9]+$'
  ) data;
`);

function calculateGroupStandings(groupId) {
  const matches = groupMatches.filter((match) => match.group_id === groupId);
  const stats = new Map();

  for (const match of matches) {
    for (const side of ["home", "away"]) {
      const id = match[`${side}_team_id`];
      const name = match[`${side}_team`];
      if (!id || !name || stats.has(id)) continue;
      stats.set(id, {
        id,
        name,
        group: groupId,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
      });
    }
  }

  for (const match of matches) {
    if (match.home_score === null || match.away_score === null) continue;

    const home = stats.get(match.home_team_id);
    const away = stats.get(match.away_team_id);
    if (!home || !away) continue;

    home.goalsFor += match.home_score;
    home.goalsAgainst += match.away_score;
    away.goalsFor += match.away_score;
    away.goalsAgainst += match.home_score;

    if (match.home_score > match.away_score) {
      home.points += 3;
    } else if (match.home_score < match.away_score) {
      away.points += 3;
    } else {
      home.points += 1;
      away.points += 1;
    }
  }

  for (const team of stats.values()) {
    team.goalDifference = team.goalsFor - team.goalsAgainst;
  }

  return sortStandings([...stats.values()], matches);
}

function sortStandings(standings, matches) {
  const pointGroups = splitByCriterion(standings, (team) => team.points);
  return pointGroups.flatMap((group) => resolveTie(group, matches));
}

function resolveTie(tiedTeams, matches) {
  if (tiedTeams.length <= 1) return tiedTeams;

  const tiedIds = new Set(tiedTeams.map((team) => team.id));
  const headToHead = new Map(
    tiedTeams.map((team) => [
      team.id,
      { points: 0, goalsFor: 0, goalDifference: 0 },
    ])
  );

  for (const match of matches) {
    if (!tiedIds.has(match.home_team_id) || !tiedIds.has(match.away_team_id)) continue;
    if (match.home_score === null || match.away_score === null) continue;

    const home = headToHead.get(match.home_team_id);
    const away = headToHead.get(match.away_team_id);
    home.goalsFor += match.home_score;
    home.goalDifference += match.home_score - match.away_score;
    away.goalsFor += match.away_score;
    away.goalDifference += match.away_score - match.home_score;

    if (match.home_score > match.away_score) {
      home.points += 3;
    } else if (match.home_score < match.away_score) {
      away.points += 3;
    } else {
      home.points += 1;
      away.points += 1;
    }
  }

  for (const criterion of [
    (team) => headToHead.get(team.id).points,
    (team) => headToHead.get(team.id).goalDifference,
    (team) => headToHead.get(team.id).goalsFor,
  ]) {
    const groups = splitByCriterion(tiedTeams, criterion);
    if (groups.length > 1) {
      return groups.flatMap((group) => resolveTie(group, matches));
    }
  }

  return splitByCriterion(tiedTeams, (team) => team.goalDifference)
    .flatMap((group) => splitByCriterion(group, (team) => team.goalsFor))
    .flatMap((group) => group.sort((a, b) => a.name.localeCompare(b.name)));
}

function splitByCriterion(items, getValue) {
  const groups = [];
  const sorted = [...items].sort((a, b) => getValue(b) - getValue(a));

  for (const item of sorted) {
    const current = groups.at(-1);
    if (!current || getValue(current[0]) !== getValue(item)) {
      groups.push([item]);
    } else {
      current.push(item);
    }
  }

  return groups;
}

function compareThirds(a, b) {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return a.group.localeCompare(b.group);
}

function isGroupComplete(groupId) {
  const matches = groupMatches.filter((match) => match.group_id === groupId);
  return (
    matches.length === 6 &&
    matches.every(
      (match) =>
        match.status === "completed" &&
        match.home_score !== null &&
        match.away_score !== null
    )
  );
}

function expectedRoundOf32() {
  const standingsByGroup = Object.fromEntries(
    GROUPS.map((group) => [group, calculateGroupStandings(group)])
  );
  const incompleteGroups = GROUPS.filter((group) => !isGroupComplete(group));

  if (incompleteGroups.length > 0) {
    return { ready: false, incompleteGroups };
  }

  const thirds = GROUPS.map((group) => standingsByGroup[group][2]).sort(compareThirds).slice(0, 8);
  const allocationKey = thirds.map((third) => third.group).sort().join("");
  const allocation = THIRD_PLACE_ALLOCATIONS[allocationKey];

  if (!allocation) {
    throw new Error(`Missing third-place allocation for ${allocationKey}.`);
  }

  const thirdByGroup = Object.fromEntries(thirds.map((third) => [third.group, third]));
  const first = (group) => standingsByGroup[group][0];
  const second = (group) => standingsByGroup[group][1];
  const thirdForSlot = (slot) => thirdByGroup[allocation[slot]] || null;

  const pairings = [
    { home: second("A"), away: second("B") },
    { home: first("E"), away: thirdForSlot("E") },
    { home: first("F"), away: second("C") },
    { home: first("C"), away: second("F") },
    { home: first("I"), away: thirdForSlot("I") },
    { home: second("E"), away: second("I") },
    { home: first("A"), away: thirdForSlot("A") },
    { home: first("L"), away: thirdForSlot("L") },
    { home: first("D"), away: thirdForSlot("D") },
    { home: first("G"), away: thirdForSlot("G") },
    { home: second("K"), away: second("L") },
    { home: first("H"), away: second("J") },
    { home: first("B"), away: thirdForSlot("B") },
    { home: first("J"), away: second("H") },
    { home: first("K"), away: thirdForSlot("K") },
    { home: second("D"), away: second("G") },
  ].map((pairing, index) => ({
    id: `R32_${index + 1}`,
    home_team_id: pairing.home?.id || null,
    home_team: pairing.home?.name || null,
    away_team_id: pairing.away?.id || null,
    away_team: pairing.away?.name || null,
  }));

  return { ready: true, allocationKey, allocation, thirds, pairings };
}

const result = expectedRoundOf32();

if (!result.ready) {
  console.log(`Not ready. Incomplete groups: ${result.incompleteGroups.join(", ")}`);
  process.exit(0);
}

const currentById = new Map(currentRoundOf32.map((match) => [match.id, match]));
const mismatches = result.pairings.filter((expected) => {
  const current = currentById.get(expected.id);
  return (
    !current ||
    current.home_team_id !== expected.home_team_id ||
    current.away_team_id !== expected.away_team_id
  );
});

console.log(`Best third groups: ${result.allocationKey}`);
console.log(
  `Best thirds: ${result.thirds
    .map((team) => `${team.group}:${team.name}`)
    .join(", ")}`
);

if (mismatches.length === 0) {
  console.log("Round of 32 bracket matches the expected FIFA third-place allocation.");
  process.exit(0);
}

console.log("Round of 32 mismatches:");
for (const mismatch of mismatches) {
  const current = currentById.get(mismatch.id);
  console.log(
    [
      mismatch.id,
      `current=${current?.home_team || "NULL"} vs ${current?.away_team || "NULL"}`,
      `expected=${mismatch.home_team || "NULL"} vs ${mismatch.away_team || "NULL"}`,
    ].join(" | ")
  );
}

if (!process.argv.includes("--apply")) {
  console.log("Run with --apply to update Supabase.");
  process.exit(2);
}

const updates = result.pairings
  .map(
    (pairing) => `
      UPDATE public.matches
      SET
        home_team_id = ${pairing.home_team_id ? `'${pairing.home_team_id}'::uuid` : "NULL"},
        away_team_id = ${pairing.away_team_id ? `'${pairing.away_team_id}'::uuid` : "NULL"},
        updated_at = now()
      WHERE id = '${pairing.id}';
    `
  )
  .join("\n");

psqlExec(`BEGIN;${updates}COMMIT;`);
console.log("Round of 32 bracket updated.");
