---
id: pay-mana-by-hand
name: Pay for spells by tapping mana yourself
status: implemented
---

## Story

As a player
I want to tap my own lands for mana and then cast from that reserve
So that I decide which sources pay, and hold up exactly the mana I mean to

## Rule: A global setting turns manual mana on; off, mana auto-pays as before

The "tap mana manually" toggle lives in the taskbar Settings menu and is
remembered across sessions. It is off by default. When off, casting a spell pays
for it automatically, and the engine only asks the human where a payment has a
genuine choice (see `step-through-a-turn.md`, "Paying with a specific source").

```gherkin
Example: The setting is off by default and mana auto-pays
  Given a new player has not opened Settings
  When they cast a spell they can afford
  Then the engine pays for it automatically

Example: Turning the setting on requires pooling mana before casting
  Given the player has enabled "tap mana manually"
  Then casting no longer auto-taps their lands
  And they must first tap sources to make the mana
```

## Rule: With the setting on, tap your own sources at priority to pool mana

While the setting is on and the player has priority, every permanent that can
make mana — land, rock, or creature — is tappable. Tapping one adds its mana to
the player's reserve, shown beside their life. A source that makes more than one
color asks which to make before it is tapped.

```gherkin
Example: Tapping a land to pool its mana
  Given manual mana is on and it is the player's main phase
  When they tap one of their lands
  Then that land's mana is added to their reserve

Example: A non-land source pools mana too
  Given the player controls a mana rock or a creature that makes mana
  When they tap it
  Then its mana is added to their reserve like a land's

Example: Choosing a color from a dual source
  Given the player taps a source that can make more than one color
  When they are asked which color to make
  Then they pick one, and that color is added to their reserve
```

## Rule: A spell is castable only when the reserve already covers its cost

With the setting on, a spell can be cast only when the floating reserve pays its
whole cost — each colored pip from its own color, the generic part from whatever
is left. Spells the reserve cannot cover are not offered, so casting never taps a
land the player did not choose. Casting spends the reserve and goes straight to
choosing targets — there is no separate payment step to confirm.

```gherkin
Example: Casting once the reserve covers the cost
  Given manual mana is on and the player has pooled enough mana for a spell
  When they cast that spell
  Then its cost is paid from the reserve
  And no additional land is tapped
  And they go straight to choosing its targets

Example: A spell you cannot yet pay for is not castable
  Given manual mana is on and the reserve does not cover a spell's cost
  Then that spell is not offered to cast
  And the player must pool more mana first
```

## Open Questions

- Colored pips are matched to floating mana of the same color; hybrid and
  Phyrexian pips are not modeled, so such spells read as not-yet-payable until
  their plain-color mana is floating.
