import type { GuideState, GuideTester, StepKey } from "./testGuideApi";

/**
 * The test tasks. Each gives the tester a goal and the facts they'd naturally know, not where to click:
 * the test is whether HolyApp itself is easy to find one's way around. The hint says where to go, for
 * testers who get stuck, and using it is recorded.
 */

/** Something the tester can't know or make up (an email, a link), shown with a Copy button. */
export interface GuideDetail {
  label: string;
  value: string;
  copy?: string;
}

export interface GuideStep {
  key: StepKey;
  title: string;
  /** The scenario, one paragraph per entry. */
  story: string[];
  /** Facts in the story the tester will type, listed so they don't have to reread the paragraph. */
  facts?: { label: string; value: string }[];
  /** Things to copy exactly (sign-in details, a link). */
  details?: GuideDetail[];
  /** A one-line note that isn't part of the test (e.g. how to finish a GCash test payment). */
  note?: string;
  hint: string;
  /** Buttons for tasks that aren't about finding one's way (e.g. opening the office page). */
  links?: { label: string; to: string }[];
  /** Shown instead of the task while it waits for the parish office. */
  waiting?: string;
  /** A problem to show above the task (e.g. the office turned the request down). */
  problem?: string;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function longDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export const STEP_ORDER: StepKey[] = ["signin", "request", "contact", "records", "pay", "mass", "give", "certificate", "office", "logout"];

const GCASH_NOTE = 'Payments here are tests: no real money is taken. On the GCash test page, finish with "Authorize Test Payment".';

export function signInStep(email: string, password: string): GuideStep {
  return {
    key: "signin",
    title: "Sign in",
    story: ["The parish gave you a HolyApp account. Sign in with it."],
    details: [
      { label: "Email", value: email, copy: email },
      { label: "Password", value: password, copy: password },
    ],
    hint: "The sign-in form is on this page. Enter the email and password, then tap Sign in.",
  };
}

export function buildSteps(state: GuideState): Record<StepKey, GuideStep> {
  const t: GuideTester = state.tester;
  const request = state.request;
  const rejected = request?.status === "rejected";
  const checkLink = request?.certificateHash ? `${window.location.origin}/verify/${request.certificateHash}` : null;
  const officeAddress = `${window.location.origin}/${t.parishSlug}/admin`;
  const she = t.sex === "Female" ? "she" : "he";
  const her = t.sex === "Female" ? "her" : "his";

  return {
    signin: signInStep(t.email, ""),
    request: {
      key: "request",
      title: "Get your cousin's baptismal certificate",
      problem: rejected
        ? `The parish office could not find a record for your last request${request?.rejectionReason ? `: "${request.rejectionReason}"` : "."} Check the details and send a new request.`
        : undefined,
      story: [
        `Your cousin ${t.first} ${t.last} needs ${her} baptismal certificate for school enrollment, and a digital copy is fine. ${she[0].toUpperCase()}${she.slice(1)} asked you to request it for ${t.sex === "Female" ? "her" : "him"}.`,
      ],
      facts: [
        { label: "Name", value: `${t.first} ${t.last} (${she} doesn't know ${her} middle name on the record)` },
        { label: "Born", value: `${longDate(t.born)}, in ${t.birthplace}` },
        { label: "Baptized", value: `${longDate(t.baptized)}, at this parish` },
        { label: "Parents", value: `${t.father} and ${t.mother}` },
      ],
      hint: `Open Certificates in the menu at the top, then Request a certificate. Choose "Someone else" for who it is for. ${her[0].toUpperCase()}${her.slice(1)} parents go under "Add parents and godparents".`,
    },
    contact: {
      key: "contact",
      title: "Update your mobile number",
      story: ["You got a new mobile number. Update it in your HolyApp account so the parish can reach you."],
      facts: [{ label: "New number", value: t.contactNumber }],
      hint: "Tap your name at the top right, then Account. Tap Edit to change your details, then Save changes.",
    },
    records: {
      key: "records",
      title: "Look at your records",
      story: [
        "You want to see which sacraments the parish has on file for you, and how a marriage application would work. Find both pages and look around.",
      ],
      hint: "Open My records in the menu at the top. It has the Sacramental timeline and the Marriage application.",
    },
    pay: {
      key: "pay",
      title: "Pay for the certificate",
      waiting:
        !request || request.status === "pending"
          ? "The parish office is looking for your cousin's record. This takes about a minute, and HolyApp will notify you. Start the next task meanwhile."
          : undefined,
      story: [`The parish found your cousin's record. Pay for ${her} certificate with GCash.`],
      note: GCASH_NOTE,
      hint: "Open Certificates → My requests and open the request. The pay button is on the request.",
    },
    mass: {
      key: "mass",
      title: "Offer a Mass",
      story: [
        `Your family wants a Mass offered for the soul of ${t.massFor}, on any date and time that is open, with a donation to the parish.`,
      ],
      facts: [
        { label: "For", value: t.massFor },
        { label: "Donation", value: `₱${t.donation}, through GCash` },
      ],
      note: GCASH_NOTE,
      hint: 'Open Masses in the menu at the top, then Offer a Mass. The reason is "In memory of the deceased".',
    },
    give: {
      key: "give",
      title: "Give to the parish",
      story: ["You'd like to give a small gift to the parish online."],
      facts: [{ label: "Amount", value: "₱20, through GCash" }],
      note: GCASH_NOTE,
      hint: "Tap Give in the menu at the top.",
    },
    certificate: {
      key: "certificate",
      title: "Check the certificate",
      waiting: request?.released
        ? undefined
        : request?.paid
          ? "The parish office is releasing the certificate. This takes about a minute. Start the next task meanwhile."
          : "The certificate is released after you pay for it. Start the next task meanwhile.",
      story: [
        "Your cousin's certificate has been released to you. Open it and look it over. Then use HolyApp's certificate check to make sure it's real, with the check link below.",
      ],
      details: checkLink ? [{ label: "Check link", value: checkLink, copy: checkLink }] : undefined,
      hint: 'Open Certificates → Certificate wallet to open it. Under your certificates, tap "Check that it\'s real" and paste the link.',
    },
    office: {
      key: "office",
      title: "Try the parish office pages",
      story: [
        "Parishioners shouldn't be able to open the parish office's pages. Try to open them at the address below and see what happens.",
      ],
      details: [{ label: "Office address", value: officeAddress, copy: officeAddress }],
      links: [{ label: "Open the office address", to: "admin" }],
      hint: "Tap the button above, or paste the address into your browser's address bar.",
    },
    logout: {
      key: "logout",
      title: "Log out",
      story: ["You're finished for now. Log out of HolyApp."],
      hint: "Tap your name at the top right, then Log out. If you're on a page without the menu, go back to your home page first.",
      links: [{ label: "Go to my home page", to: "portal" }],
    },
  };
}
