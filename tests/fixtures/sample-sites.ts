// Five sites that cover different record states, used by the unit and page tests. They were the minimal home
// page's links (roadmap task 4.3, spec 04 FR-8) until Phase 11 replaced that page (spec 11 D10, FR-25).
// A fixed, reviewed list; a test fails when an ID leaves the data.
export const HOME_SAMPLE_IDS = [
  'JB-DHK-064', // Baliati Palace: full record, verified location, photos, preserved
  'JB-RAJ-002', // Elangi: sparse, no pin, no photo, condition unknown
  'JB-DHK-008', // Dhar Zamindar Bari: the only unverified mapped site (O9), in ruins
  'JB-DHK-020', // Amirabad Estate: approximate location, in ruins
  'JB-RAJ-059', // Betkhair Bagerbari: Bangla name not yet recorded (O13)
] as const;
