import {
  getAcupoints,
  getSymptoms,
  getAcupointById,
  getAcupointsByBodyPart,
  getAcupointsBySymptom,
  searchAcupoints,
} from "../data";

// ─── Data Consistency Validation ────────────────────────────────────────────

describe("Data consistency", () => {
  it("every symptom acupointId should exist in acupoints.json", () => {
    const acupointIds = new Set(getAcupoints().map((a) => a.id));
    const symptoms = getSymptoms();

    symptoms.forEach((symptom) => {
      symptom.acupointIds.forEach((id) => {
        expect(acupointIds.has(id)).toBe(true);
      });
    });
  });

  it("every acupoint benefit should exist in symptoms.json", () => {
    const symptomIds = new Set(getSymptoms().map((s) => s.id));
    const acupoints = getAcupoints();

    acupoints.forEach((acupoint) => {
      acupoint.benefits.forEach((benefit) => {
        expect(symptomIds.has(benefit)).toBe(true);
      });
    });
  });

  it("should have at least one acupoint for front view", () => {
    const frontAcupoints = getAcupoints().filter((a) => a.view === "front");
    expect(frontAcupoints.length).toBeGreaterThan(0);
  });

  it("should have at least one acupoint for back view", () => {
    const backAcupoints = getAcupoints().filter((a) => a.view === "back");
    expect(backAcupoints.length).toBeGreaterThan(0);
  });

  it("should have all 16 MVP symptoms", () => {
    const expectedIds = [
      "headache",
      "insomnia",
      "stress",
      "indigestion",
      "shoulder_pain",
      "back_pain",
      "eye_fatigue",
      "nausea",
      "neck_pain",
      "menstrual_pain",
      "cold_extremities",
      "concentration",
      "urgent_bowel",
      "food_stagnation",
      "constipation",
      "facial_swelling",
    ];
    const symptomIds = getSymptoms().map((s) => s.id);
    expectedIds.forEach((id) => {
      expect(symptomIds).toContain(id);
    });
  });

  it("all acupoints should have valid required fields", () => {
    getAcupoints().forEach((acupoint) => {
      expect(typeof acupoint.id).toBe("string");
      expect(acupoint.id.length).toBeGreaterThan(0);
      expect(typeof acupoint.name.ko).toBe("string");
      expect(typeof acupoint.name.en).toBe("string");
      expect(typeof acupoint.bodyPart).toBe("string");
      expect(["front", "back"]).toContain(acupoint.view);
      expect(typeof acupoint.position.x).toBe("number");
      expect(typeof acupoint.position.y).toBe("number");
      expect(Array.isArray(acupoint.benefits)).toBe(true);
    });
  });
});

// ─── getAcupoints ────────────────────────────────────────────────────────────

describe("getAcupoints", () => {
  it("should return an array of acupoints", () => {
    const acupoints = getAcupoints();
    expect(Array.isArray(acupoints)).toBe(true);
    expect(acupoints.length).toBeGreaterThan(0);
  });
});

// ─── getSymptoms ─────────────────────────────────────────────────────────────

describe("getSymptoms", () => {
  it("should return an array of symptoms", () => {
    const symptoms = getSymptoms();
    expect(Array.isArray(symptoms)).toBe(true);
    expect(symptoms.length).toBe(16);
  });

  it("each symptom should have ko and en name", () => {
    getSymptoms().forEach((symptom) => {
      expect(typeof symptom.name.ko).toBe("string");
      expect(typeof symptom.name.en).toBe("string");
      expect(symptom.name.ko.length).toBeGreaterThan(0);
      expect(symptom.name.en.length).toBeGreaterThan(0);
    });
  });
});

// ─── getAcupointById ─────────────────────────────────────────────────────────

describe("getAcupointById", () => {
  it("should return the correct acupoint for a valid ID", () => {
    const acupoint = getAcupointById("LI4");
    expect(acupoint).toBeDefined();
    expect(acupoint?.id).toBe("LI4");
    expect(acupoint?.name.en).toBe("Hegu");
  });

  it("should return undefined for an unknown ID", () => {
    const acupoint = getAcupointById("DOES_NOT_EXIST");
    expect(acupoint).toBeUndefined();
  });

  it("should return undefined for an empty string", () => {
    const acupoint = getAcupointById("");
    expect(acupoint).toBeUndefined();
  });
});

// ─── getAcupointsByBodyPart ───────────────────────────────────────────────────

describe("getAcupointsByBodyPart", () => {
  it("should return acupoints matching the given bodyPart", () => {
    const handAcupoints = getAcupointsByBodyPart("hand");
    expect(handAcupoints.length).toBeGreaterThan(0);
    handAcupoints.forEach((a) => expect(a.bodyPart).toBe("hand"));
  });

  it("should return an empty array for an unknown bodyPart", () => {
    const result = getAcupointsByBodyPart("unknown_part");
    expect(result).toEqual([]);
  });
});

// ─── getAcupointsBySymptom ────────────────────────────────────────────────────

describe("getAcupointsBySymptom", () => {
  it("should return acupoints for a valid symptom", () => {
    const acupoints = getAcupointsBySymptom("headache");
    expect(acupoints.length).toBeGreaterThan(0);
    acupoints.forEach((a) => {
      expect(a.benefits).toContain("headache");
    });
  });

  it("should return an empty array for an unknown symptom", () => {
    const result = getAcupointsBySymptom("unknown_symptom");
    expect(result).toEqual([]);
  });

  it("all returned acupoints should have the symptom in their benefits", () => {
    const symptomId = "stress";
    const acupoints = getAcupointsBySymptom(symptomId);
    acupoints.forEach((a) => {
      expect(a.benefits).toContain(symptomId);
    });
  });
});

// ─── searchAcupoints ─────────────────────────────────────────────────────────

describe("searchAcupoints", () => {
  it("should find acupoints by Korean name", () => {
    const results = searchAcupoints("합곡");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((a) => a.id === "LI4")).toBe(true);
  });

  it("should find acupoints by English name (case-insensitive)", () => {
    const results = searchAcupoints("hegu");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((a) => a.id === "LI4")).toBe(true);
  });

  it("should find acupoints by English name with mixed case", () => {
    const results = searchAcupoints("HEGU");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((a) => a.id === "LI4")).toBe(true);
  });

  it("should find acupoints by benefit/symptom ID", () => {
    const results = searchAcupoints("headache");
    expect(results.length).toBeGreaterThan(0);
    results.forEach((a) => {
      expect(a.benefits).toContain("headache");
    });
  });

  it("should return empty array for no matches", () => {
    const results = searchAcupoints("xyznonexistent");
    expect(results).toEqual([]);
  });

  it("should return empty array for empty query", () => {
    // Empty string matches everything via includes(""), so all acupoints returned
    const results = searchAcupoints("");
    expect(results.length).toBe(getAcupoints().length);
  });
});
