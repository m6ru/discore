import type { CourseSeedFile, HoleSeed } from "./seed-types";

const MIN_PAR = 2;
const MAX_PAR = 7;
const MIN_DISTANCE_M = 1;
const MAX_DISTANCE_M = 700;

export type ValidationIssue = {
  path: string;
  message: string;
};

export type ValidationResult = {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  computedTotalPar: number;
  computedTotalDistanceM: number;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function pushError(errors: ValidationIssue[], path: string, message: string): void {
  errors.push({ path, message });
}

function validateHole(hole: unknown, index: number, errors: ValidationIssue[]): HoleSeed | null {
  const base = `holes[${index}]`;
  if (typeof hole !== "object" || hole === null) {
    pushError(errors, base, "must be an object");
    return null;
  }

  const record = hole as Record<string, unknown>;
  const holeNumber = record.hole_number;
  const par = record.par;
  const distanceM = record.distance_m;
  const notes = record.notes;
  const holeMapUrl = record.hole_map_url;

  if (!isPositiveInt(holeNumber)) {
    pushError(errors, `${base}.hole_number`, "must be a positive integer");
  }

  if (typeof par !== "number" || !Number.isInteger(par) || par < MIN_PAR || par > MAX_PAR) {
    pushError(errors, `${base}.par`, `must be an integer between ${MIN_PAR} and ${MAX_PAR}`);
  }

  if (
    typeof distanceM !== "number" ||
    !Number.isInteger(distanceM) ||
    distanceM < MIN_DISTANCE_M ||
    distanceM > MAX_DISTANCE_M
  ) {
    pushError(
      errors,
      `${base}.distance_m`,
      `must be an integer between ${MIN_DISTANCE_M} and ${MAX_DISTANCE_M}`,
    );
  }

  if (!isNullableString(notes)) {
    pushError(errors, `${base}.notes`, "must be a string or null");
  }

  if (!isNullableString(holeMapUrl)) {
    pushError(errors, `${base}.hole_map_url`, "must be a string or null");
  }

  if (errors.some((issue) => issue.path.startsWith(base))) {
    return null;
  }

  return {
    hole_number: holeNumber as number,
    par: par as number,
    distance_m: distanceM as number,
    notes: notes as string | null,
    hole_map_url: holeMapUrl as string | null,
  };
}

function validateContiguousHoles(holes: HoleSeed[], errors: ValidationIssue[]): void {
  if (holes.length === 0) {
    pushError(errors, "holes", "must contain at least one hole");
    return;
  }

  const sorted = [...holes].sort((a, b) => a.hole_number - b.hole_number);
  const numbers = sorted.map((hole) => hole.hole_number);
  const unique = new Set(numbers);

  if (unique.size !== numbers.length) {
    pushError(errors, "holes", "hole_number values must be unique");
    return;
  }

  for (let expected = 1; expected <= sorted.length; expected += 1) {
    if (numbers[expected - 1] !== expected) {
      pushError(
        errors,
        "holes",
        `hole numbers must be contiguous from 1 to ${sorted.length} (missing ${expected})`,
      );
      return;
    }
  }
}

export function validateCourseSeedFile(
  raw: unknown,
  sourceLabel: string,
): ValidationResult & { data: CourseSeedFile | null } {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (typeof raw !== "object" || raw === null) {
    pushError(errors, sourceLabel, "root must be a JSON object");
    return {
      errors,
      warnings,
      computedTotalPar: 0,
      computedTotalDistanceM: 0,
      data: null,
    };
  }

  const root = raw as Record<string, unknown>;
  const courseRaw = root.course;
  const layoutRaw = root.layout;
  const holesRaw = root.holes;

  if (typeof courseRaw !== "object" || courseRaw === null) {
    pushError(errors, "course", "required object");
  }

  if (typeof layoutRaw !== "object" || layoutRaw === null) {
    pushError(errors, "layout", "required object");
  }

  if (!Array.isArray(holesRaw)) {
    pushError(errors, "holes", "required array");
  }

  if (errors.length > 0) {
    return {
      errors,
      warnings,
      computedTotalPar: 0,
      computedTotalDistanceM: 0,
      data: null,
    };
  }

  const courseRecord = courseRaw as Record<string, unknown>;
  const layoutRecord = layoutRaw as Record<string, unknown>;

  if (!isNonEmptyString(courseRecord.name)) {
    pushError(errors, "course.name", "required non-empty string");
  }
  if (!isNonEmptyString(courseRecord.location)) {
    pushError(errors, "course.location", "required non-empty string");
  }
  if (!isNonEmptyString(courseRecord.slug)) {
    pushError(errors, "course.slug", "required non-empty string");
  }
  if (!isNullableNumber(courseRecord.lat)) {
    pushError(errors, "course.lat", "must be a number or null");
  }
  if (!isNullableNumber(courseRecord.lng)) {
    pushError(errors, "course.lng", "must be a number or null");
  }
  if (!isNullableString(courseRecord.details)) {
    pushError(errors, "course.details", "must be a string or null");
  }
  if (!isNullableString(courseRecord.terrain_type)) {
    pushError(errors, "course.terrain_type", "must be a string or null");
  }
  if (!isNullableString(courseRecord.difficulty_tier)) {
    pushError(errors, "course.difficulty_tier", "must be a string or null");
  }
  if (
    courseRecord.source_url !== undefined &&
    courseRecord.source_url !== null &&
    typeof courseRecord.source_url !== "string"
  ) {
    pushError(errors, "course.source_url", "must be a string, null, or omitted");
  }

  if (!isNonEmptyString(layoutRecord.name)) {
    pushError(errors, "layout.name", "required non-empty string");
  }
  if (!isNonEmptyString(layoutRecord.slug)) {
    pushError(errors, "layout.slug", "required non-empty string");
  }
  if (typeof layoutRecord.total_par !== "number" || !Number.isInteger(layoutRecord.total_par)) {
    pushError(errors, "layout.total_par", "required integer");
  }
  if (
    typeof layoutRecord.total_distance_m !== "number" ||
    !Number.isInteger(layoutRecord.total_distance_m)
  ) {
    pushError(errors, "layout.total_distance_m", "required integer");
  }
  if (!isNullableString(layoutRecord.map_url)) {
    pushError(errors, "layout.map_url", "must be a string or null");
  }
  if (!isBoolean(layoutRecord.is_active)) {
    pushError(errors, "layout.is_active", "required boolean");
  }

  const parsedHoles: HoleSeed[] = [];
  if (Array.isArray(holesRaw)) {
    holesRaw.forEach((hole, index) => {
      const parsed = validateHole(hole, index, errors);
      if (parsed) {
        parsedHoles.push(parsed);
      }
    });
  }

  if (errors.length === 0) {
    validateContiguousHoles(parsedHoles, errors);
  }

  const computedTotalPar = parsedHoles.reduce((sum, hole) => sum + hole.par, 0);
  const computedTotalDistanceM = parsedHoles.reduce((sum, hole) => sum + hole.distance_m, 0);

  if (errors.length === 0) {
    if (layoutRecord.total_par !== computedTotalPar) {
      warnings.push({
        path: "layout.total_par",
        message: `declared ${layoutRecord.total_par} but holes sum to ${computedTotalPar}`,
      });
    }
    if (layoutRecord.total_distance_m !== computedTotalDistanceM) {
      warnings.push({
        path: "layout.total_distance_m",
        message: `declared ${layoutRecord.total_distance_m} but holes sum to ${computedTotalDistanceM}`,
      });
    }
  }

  if (errors.length > 0) {
    return {
      errors,
      warnings,
      computedTotalPar,
      computedTotalDistanceM,
      data: null,
    };
  }

  const sourceUrl =
    courseRecord.source_url === undefined
      ? null
      : (courseRecord.source_url as string | null);

  return {
    errors,
    warnings,
    computedTotalPar,
    computedTotalDistanceM,
    data: {
      course: {
        name: courseRecord.name as string,
        location: courseRecord.location as string,
        slug: courseRecord.slug as string,
        lat: courseRecord.lat as number | null,
        lng: courseRecord.lng as number | null,
        details: courseRecord.details as string | null,
        terrain_type: courseRecord.terrain_type as string | null,
        difficulty_tier: courseRecord.difficulty_tier as string | null,
        source_url: sourceUrl,
      },
      layout: {
        name: layoutRecord.name as string,
        slug: layoutRecord.slug as string,
        total_par: layoutRecord.total_par as number,
        total_distance_m: layoutRecord.total_distance_m as number,
        map_url: layoutRecord.map_url as string | null,
        is_active: layoutRecord.is_active as boolean,
      },
      holes: parsedHoles.sort((a, b) => a.hole_number - b.hole_number),
    },
  };
}
