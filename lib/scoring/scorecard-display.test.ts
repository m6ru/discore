import { describe, expect, it } from "vitest";
import { holeScoreTone } from "./scorecard-display";

describe("holeScoreTone", () => {
  it("classifies empty, ace, eagle, birdie, par, and bogey", () => {
    expect(holeScoreTone(undefined, 3)).toBe("empty");
    expect(holeScoreTone(1, 3)).toBe("ace");
    expect(holeScoreTone(1, 4)).toBe("ace");
    expect(holeScoreTone(2, 4)).toBe("eagle");
    expect(holeScoreTone(2, 3)).toBe("birdie");
    expect(holeScoreTone(3, 3)).toBe("par");
    expect(holeScoreTone(4, 3)).toBe("bogey");
    expect(holeScoreTone(5, 3)).toBe("doubleBogey");
    expect(holeScoreTone(6, 3)).toBe("doubleBogey");
  });
});
