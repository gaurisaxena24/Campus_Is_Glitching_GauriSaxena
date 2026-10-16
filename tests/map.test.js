import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, MISSION } from '../src/js/game/state.js';
import { MISSIONS, getMission } from '../src/js/data/missions.js';
import { getDestination } from '../src/js/data/destinations.js';
import { questChipHTML } from '../src/js/ui/map.js';

test('map quest card advances to the next incomplete quest and ends on campus restored', () => {
  const state = createInitialState();
  const card = () => questChipHTML(state);

  assert.match(card(), /Frozen Character/);
  assert.match(card(), /Available/);

  state.missions[MISSIONS[0].id].status = MISSION.REPAIRED;
  assert.match(card(), /Lost Colour/);
  assert.match(card(), new RegExp(getDestination(getMission(MISSIONS[1].id).destinationId).label));
  assert.match(card(), /Available/);
  assert.doesNotMatch(card(), /Frozen Character/);

  state.missions[MISSIONS[1].id].status = MISSION.REPAIRED;
  assert.match(card(), /Lost Connection/);
  assert.doesNotMatch(card(), /Lost Colour/);

  state.missions[MISSIONS[2].id].status = MISSION.REPAIRED;
  assert.match(card(), /Campus Restored/);
  assert.match(card(), /All glitches repaired/);
  assert.doesNotMatch(card(), /Frozen Character|Lost Colour|Lost Connection/);
});

test('map quest card reflects the current quest location and active progress state', () => {
  const state = createInitialState();
  state.missions[MISSIONS[0].id].status = MISSION.REPAIRED;
  state.missions[MISSIONS[1].id].status = MISSION.ACTIVE;
  const card = questChipHTML(state);
  assert.match(card, /Lost Colour/);
  assert.match(card, /In progress/);
  assert.match(card, new RegExp(getDestination(getMission(MISSIONS[1].id).destinationId).label));
});
