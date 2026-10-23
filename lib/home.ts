// The five sites the minimal home page links to (roadmap task 4.3, spec 04 FR-8). A fixed, reviewed
// list chosen to cover different record states; an ID that leaves the data fails the build (getSite throws).
export const HOME_SAMPLE_IDS = [
  'JB-DHK-064', // Baliati Palace: full record, verified location, photos, preserved
  'JB-RAJ-002', // Elangi: sparse, no pin, no photo, condition unknown
  'JB-DHK-008', // Dhar Zamindar Bari: the only unverified mapped site (O9), in ruins
  'JB-DHK-020', // Amirabad Estate: approximate location, in ruins
  'JB-RAJ-059', // Betkhair Bagerbari: Bangla name not yet recorded (O13)
] as const;
