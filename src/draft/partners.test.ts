import { describe, it, expect } from "vitest";
import { canPairAsCommanders, type PairingCard } from "./partners";

function legend(name: string, oracleText: string, typeLine = "Legendary Creature — Human"): PairingCard {
  return { name, oracleText, typeLine };
}

const KRAUM = legend(
  "Kraum, Ludevic's Opus",
  "Flying, haste\nWhenever an opponent casts their second spell each turn, draw a card.\nPartner (You can have two commanders if both have partner.)",
);
const TYMNA = legend("Tymna the Weaver", "Lifelink\nPartner (You can have two commanders if both have partner.)");
const ABBY = legend("Abby, Merciless Soldier", "Partner—Survivors (You can have two commanders if both have this ability.)");
const ELLIE = legend("Ellie, Brick Master", "Partner—Survivors (You can have two commanders if both have this ability.)");
const PIR = legend(
  "Pir, Imaginative Rascal",
  "Partner with Toothy, Imaginary Friend (When this creature enters, target player may put Toothy into their hand from their library, then shuffle.)",
);
const TOOTHY = legend(
  "Toothy, Imaginary Friend",
  "Partner with Pir, Imaginative Rascal (When this creature enters, target player may put Pir into their hand from their library, then shuffle.)",
);
const BJORNA = legend("Bjorna, Nightfall Alchemist", "Friends forever (You can have two commanders if both have friends forever.)");
const CECILY = legend("Cecily, Haunted Mage", "Friends forever (You can have two commanders if both have friends forever.)");
const WILSON = legend("Wilson, Refined Grizzly", "Choose a Background (You can have a Background as a second commander.)");
const CANDLEKEEP = legend("Candlekeep Sage", "Commander creatures you own have \"…\"", "Legendary Enchantment — Background");
const THIRTEENTH_DOCTOR = legend("The Thirteenth Doctor", "", "Legendary Creature — Time Lord Doctor");
const DOCTOR_WIZARD = legend("Doctor Wizard", "", "Legendary Creature — Time Lord Doctor Wizard");
const CLARA = legend("Clara Oswald", "Doctor's companion (You can have two commanders if the other is the Doctor.)");
const AMY = legend(
  "Amy Pond",
  "Partner with Rory Williams (When this creature enters, target player may put Rory into their hand from their library, then shuffle.)\nDoctor's companion (You can have two commanders if the other is the Doctor.)",
);
const RORY = legend(
  "Rory Williams",
  "Partner with Amy Pond (When this creature enters, target player may put Amy into their hand from their library, then shuffle.)\nDoctor's companion (You can have two commanders if the other is the Doctor.)",
);
const APRIL = legend("April O'Neil, Live on the Scene", "Partner—Character select (You can have two commanders if both have this ability.)");
const LEONARDO = legend("Leonardo, the Balance", "Partner—Character select (You can have two commanders if both have this ability.)");
const PLAIN = legend("Plain Legend", "Flying");

describe("canPairAsCommanders", () => {
  it.each([
    ["two Partner cards", KRAUM, TYMNA],
    ["two of the same Partner— variant", ABBY, ELLIE],
    ["two of Partner—Character select", APRIL, LEONARDO],
    ["Partner with cards naming each other", PIR, TOOTHY],
    ["two Friends forever cards", BJORNA, CECILY],
    ["Choose a Background with a Background", WILSON, CANDLEKEEP],
    ["Doctor's companion with the Doctor", CLARA, THIRTEENTH_DOCTOR],
    ["a card with two pairing abilities, by either", AMY, RORY],
    ["a card with two pairing abilities, by its second", AMY, THIRTEENTH_DOCTOR],
  ])("pairs %s, in either order", (_, a, b) => {
    expect(canPairAsCommanders(a, b)).toBe(true);
    expect(canPairAsCommanders(b, a)).toBe(true);
  });

  it.each([
    ["plain Partner with a Partner— variant", KRAUM, ABBY],
    ["Partner with a Friends forever card", KRAUM, BJORNA],
    ["Partner with someone other than its named card", PIR, KRAUM],
    ["Choose a Background with a creature", WILSON, KRAUM],
    ["a Background with a plain Partner", CANDLEKEEP, KRAUM],
    ["Doctor's companion with a Doctor that has other creature types", CLARA, DOCTOR_WIZARD],
    ["two Doctor's companions", CLARA, AMY],
    ["two Backgrounds", CANDLEKEEP, { ...CANDLEKEEP, name: "Other Background" }],
    ["a legend without a pairing ability", PLAIN, TYMNA],
    ["a card with itself", KRAUM, KRAUM],
  ])("does not pair %s", (_, a, b) => {
    expect(canPairAsCommanders(a, b)).toBe(false);
    expect(canPairAsCommanders(b, a)).toBe(false);
  });
});
