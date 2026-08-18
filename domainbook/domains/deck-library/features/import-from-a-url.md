---
id: import-from-a-url
name: Import a deck from a URL
status: implemented
---

## Story

As a deck author
I want to paste a Moxfield or Archidekt deck URL and have its cards filled in
So that I don't have to copy the list by hand

## Rule: A recognized deck URL fills the editor

The fetched deck becomes the same pasted-decklist text the author would type — its
commander lands in the Commander section, the rest in the deck — ready to review
and save. The deck's name pre-fills the name field only when it is still empty.

```gherkin
Example: Importing an Archidekt deck
  Given a public or unlisted Archidekt deck URL
  When the author imports it
  Then the commander and the rest of the cards fill the decklist
  And the deck name fills the name field if it was empty
  And the author can review and save it like any typed deck
```

```gherkin
Example: Importing a Moxfield deck
  Given a public or unlisted Moxfield deck URL
  When the author imports it
  Then the mainboard and commanders fill the decklist
  And the sideboard and maybeboard are left out
```

## Rule: The author is told when a URL can't be imported

```gherkin
Example: A Ligamagic URL
  Given a Ligamagic deck URL
  When the author imports it
  Then they are told to export the list on Ligamagic and paste it instead

Example: A URL that isn't a deck site
  Given a URL that is not Moxfield, Archidekt, or Ligamagic
  When the author imports it
  Then they are told it isn't a supported deck URL

Example: The deck can't be reached
  Given a supported URL whose deck can't be fetched
  When the import fails
  Then the author sees why — not found, or the import proxy is unreachable
```

## Open Questions

- Whether to rely on the default public proxy or require the owned `deck-proxy`
  worker; Moxfield needs the owned proxy with an approved User-Agent, Archidekt
  works through either.
- Whether Ligamagic could be supported later (its deck data is behind a page
  session token, so it would need a different approach than a plain fetch).
- Whether to import more than the mainboard and commanders (companions,
  signature spells) for the formats that use them.
