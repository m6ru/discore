import { describe, expect, it } from "vitest";
import { buildAgentPrompt, suggestionKindLabel } from "./course-suggestions";

const base = {
  id: "s1",
  kind: "hole_info",
  courseName: "Test Park",
  courseSlug: "test-park",
  layoutName: "Main",
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
