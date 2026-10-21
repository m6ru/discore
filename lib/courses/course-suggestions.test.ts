import { describe, expect, it } from "vitest";
import { buildAgentPrompt, describeHoleFix, suggestionKindLabel } from "./course-suggestions";

const base = {
  id: "s1",
  kind: "hole_info",
  courseName: "Test Park",
  courseSlug: "test-park",
  layoutName: "Main",
  holeNumber: null,
  location: null,
  note: "Hole 7 is par 4 now",
  createdAt: "2026-10-22T10:00:00Z",
  photoUrls: [],
};

describe("suggestionKindLabel", () => {
  it("labels known kinds and new courses", () => {
    expect(suggestionKindLabel("hole_info")).toBe("Hole par or length");
    expect(suggestionKindLabel("new_course")).toBe("New course");
  });
});

describe("buildAgentPrompt", () => {
  it("names the course, slug, layout and note", () => {
    const prompt = buildAgentPrompt(base);
    expect(prompt).toContain("Course: Test Park (slug test-park) · Layout: Main");
    expect(prompt).toContain("Type: Hole par or length");
    expect(prompt).toContain("Hole 7 is par 4 now");
    expect(prompt).toContain("Never invent hole data");
    expect(prompt).not.toContain("Photos");
  });

  it("names the hole when there is one", () => {
    expect(buildAgentPrompt({ ...base, holeNumber: 7 })).toContain("Layout: Main · Hole 7");
  });

  it("describes a new course with its location and lists photo links", () => {
    const prompt = buildAgentPrompt({
      ...base,
      kind: "new_course",
      courseName: "Forest Park",
      courseSlug: null,
      layoutName: null,
      location: "Somewhere",
      photoUrls: ["https://example.test/a.jpg"],
    });
    expect(prompt).toContain("New course: Forest Park (Somewhere)");
    expect(prompt).toContain("- https://example.test/a.jpg");
  });
});

describe("describeHoleFix", () => {
  const current = { par: 3, distanceM: 85, notes: "OB left" };

  it("lists every changed value and the comment", () => {
    expect(describeHoleFix(7, current, { par: 4, distanceM: 92, notes: "OB left and right" }, " New tee ")).toBe(
      'Hole 7: Par 3 → 4 · Length 85 → 92 m\nNotes: "OB left" → "OB left and right"\n\nNew tee'
    );
  });

  it("sends a comment alone", () => {
    expect(describeHoleFix(2, current, current, "Basket moved")).toBe("Hole 2\n\nBasket moved");
  });

  it("returns null when nothing changed", () => {
    expect(describeHoleFix(2, current, { ...current, notes: " OB left " }, "  ")).toBeNull();
  });
});
