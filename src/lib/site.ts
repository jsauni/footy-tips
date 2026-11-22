/**
 * Who runs the app. Shown in the Privacy Policy, Terms and Disclaimer.
 * Fill these in before launch (and have the legal pages reviewed).
 */
export const site = {
  name: "Footy Tips",
  /** Your full name, or your business name and ABN. */
  operator: "[Operator name]",
  /** Where people send privacy requests, complaints and questions. */
  contactEmail: "[contact email]",
  /** State or territory whose law governs the Terms. */
  governingState: "[State]",
  /** Where Supabase stores the data (the region you picked for the project). */
  dataRegion: "Sydney, Australia",
  /** The service that sends sign-in emails (your SMTP provider). */
  emailProvider: "[email provider, e.g. Resend]",
  /** Date the legal pages last changed. */
  legalUpdated: "22 November 2026",
} as const;
