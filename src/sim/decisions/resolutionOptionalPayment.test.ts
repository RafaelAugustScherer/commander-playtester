import { describe, it, expect } from "vitest";
import {
  parseResolutionOptionalPaymentPrompt,
  declineResolutionOptionalPaymentAction,
  payResolutionOptionalPaymentAction,
} from "./resolutionOptionalPayment";
import type { GameObject, WaitingFor } from "../../engine/types";

// Shape confirmed against phase-rs client/src/adapter/types.ts (v0.71.0) and
// crates/engine/tests/integration/resolution_optional_payments.rs: `costs`
// keeps each branch's original index so a filtered-out (unaffordable) branch
// doesn't shift the rest.
const REAL_RESOLUTION_OPTIONAL_PAYMENT: WaitingFor = {
  type: "ResolutionOptionalPaymentChoice",
  data: {
    player: 1,
    source_id: 7,
    costs: [
      { index: 0, cost: { type: "Mana", cost: { type: "Cost", shards: [], generic: 2 } } },
      { index: 2, cost: { type: "Discard", count: { type: "Fixed", value: 1 } } },
    ],
  },
};

const OBJECTS: Record<string, GameObject> = {
  7: { id: 7, name: "Payment Source", zone: "Battlefield" },
};

describe("parseResolutionOptionalPaymentPrompt", () => {
  it("parses the branch options and their original indices", () => {
    const p = parseResolutionOptionalPaymentPrompt(
      REAL_RESOLUTION_OPTIONAL_PAYMENT,
      OBJECTS,
    )!;
    expect(p).not.toBeNull();
    expect(p.player).toBe(1);
    expect(p.sourceName).toBe("Payment Source");
    expect(p.options).toEqual([
      { index: 0, label: "{2}" },
      { index: 2, label: "Discard 1 card" },
    ]);
  });

  it("falls back to an empty source name when the object is unknown", () => {
    const p = parseResolutionOptionalPaymentPrompt(REAL_RESOLUTION_OPTIONAL_PAYMENT);
    expect(p?.sourceName).toBe("");
  });

  it("returns null for a non-matching waiting_for", () => {
    expect(parseResolutionOptionalPaymentPrompt(undefined)).toBeNull();
    expect(parseResolutionOptionalPaymentPrompt({ type: "Priority", data: {} })).toBeNull();
  });

  it("returns null when there are no payable branches", () => {
    const wf: WaitingFor = {
      type: "ResolutionOptionalPaymentChoice",
      data: { player: 0, source_id: 7, costs: [] },
    };
    expect(parseResolutionOptionalPaymentPrompt(wf)).toBeNull();
  });
});

describe("declineResolutionOptionalPaymentAction", () => {
  it("builds the Decline action", () => {
    expect(declineResolutionOptionalPaymentAction()).toEqual({
      type: "ChooseResolutionOptionalPaymentBranch",
      data: { choice: { type: "Decline" } },
    });
  });
});

describe("payResolutionOptionalPaymentAction", () => {
  it("builds the Pay action echoing the branch's original index", () => {
    expect(payResolutionOptionalPaymentAction(2)).toEqual({
      type: "ChooseResolutionOptionalPaymentBranch",
      data: { choice: { type: "Pay", data: { index: 2 } } },
    });
  });
});
