// Feature flags — flip to true when the feature is ready to ship.
// Code-level decisions (not env vars) to prevent accidental exposure.
export const FEATURES = {
  // Branch challenges (check out a book, attend a program, meet a librarian)
  // Awaiting: TPL partnership + in-branch QR signage deployment
  // Re-enable: set to true. Affects: BranchChallenges.vue, useAchievements.js (quest_master), passport.js (demo state)
  challenges: false,

  // QR code check-in via camera scan
  // Awaiting: QR codes deployed at branches
  // Re-enable: set to true. Affects: check-in.vue (scanner button + overlay)
  qrCheckIn: false,
}
