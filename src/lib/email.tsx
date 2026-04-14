/**
 * FILE: src/lib/email.tsx
 *
 * What this does:
 * All email sending lives here. Uses Resend (free: 3,000 emails/month).
 * Every type of notification USC sends — new event alerts, waitlist
 * confirmations, spot-opened alerts — is a function in this file.
 *
 * To activate emails: add RESEND_API_KEY to your .env.local and Vercel.
 * Get a free key at resend.com (takes 2 minutes).
 */

import { Resend } from "resend";

// Lazy client — only created when actually sending (avoids crash if no key)
function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

// The "from" address — update this once you have a custom domain
const FROM = "Udaipur Sports Club <noreply@usc-platform-beta.vercel.app>";

// ── Email: New event created ──────────────────────────────────────────
// Sent to all members when a host creates a new event
export async function sendNewEventEmail({
  to,
  userName,
  eventTitle,
  sport,
  date,
  time,
  location,
  eventUrl,
  perPerson,
}: {
  to:         string;
  userName:   string;
  eventTitle: string;
  sport:      string;
  date:       string;
  time:       string;
  location:   string;
  eventUrl:   string;
  perPerson:  number;
}) {
  if (!process.env.RESEND_API_KEY) return; // Skip silently if no key yet

  await getResend()!.emails.send({
    from:    FROM,
    to:      [to],
    subject: `New event: ${eventTitle} 🏅`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; background: #F9F7F4; padding: 40px 20px;">
        <div style="background: white; border-radius: 20px; padding: 40px; border: 1px solid #e7e5e4;">

          <!-- Header -->
          <p style="color: #F59E0B; font-size: 11px; font-weight: 700; letter-spacing: 0.25em; text-transform: uppercase; margin: 0 0 24px;">
            Udaipur Sports Club
          </p>

          <h1 style="color: #0f172a; font-size: 26px; font-weight: 800; margin: 0 0 8px; line-height: 1.2;">
            New event just dropped, ${userName.split(" ")[0]}!
          </h1>

          <p style="color: #64748b; font-size: 14px; margin: 0 0 32px;">
            A new sports event has been posted. Grab your spot before it fills up.
          </p>

          <!-- Event card -->
          <div style="background: #050A18; border-radius: 16px; padding: 28px; margin-bottom: 28px;">
            <p style="color: #F59E0B; font-size: 11px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 12px;">
              ${sport}
            </p>
            <h2 style="color: white; font-size: 22px; font-weight: 800; margin: 0 0 20px; line-height: 1.2;">
              ${eventTitle}
            </h2>
            <p style="color: #94a3b8; font-size: 14px; margin: 0 0 8px;">📅 ${date} at ${time}</p>
            <p style="color: #94a3b8; font-size: 14px; margin: 0 0 8px;">📍 ${location}</p>
            ${perPerson > 0
              ? `<p style="color: #F59E0B; font-size: 14px; margin: 0;">💰 ₹${perPerson} per person</p>`
              : `<p style="color: #4ade80; font-size: 14px; margin: 0;">✓ Free event</p>`
            }
          </div>

          <!-- CTA -->
          <a href="${eventUrl}"
            style="display: block; background: #F59E0B; color: white; text-align: center; padding: 16px; border-radius: 12px; font-weight: 700; font-size: 15px; text-decoration: none;">
            View Event & RSVP →
          </a>

          <p style="color: #cbd5e1; font-size: 12px; text-align: center; margin: 24px 0 0;">
            You received this because you're a USC member.
          </p>

        </div>
      </div>
    `,
  });
}

// ── Email: Waitlist confirmation ──────────────────────────────────────
// Sent when someone joins the waitlist for a full event
export async function sendWaitlistEmail({
  to,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userName: _userName,
  eventTitle,
  position,
  eventUrl,
}: {
  to:         string;
  userName:   string;
  eventTitle: string;
  position:   number;
  eventUrl:   string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  await getResend()!.emails.send({
    from:    FROM,
    to:      [to],
    subject: `You're #${position} on the waitlist — ${eventTitle}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; background: #F9F7F4; padding: 40px 20px;">
        <div style="background: white; border-radius: 20px; padding: 40px; border: 1px solid #e7e5e4;">
          <p style="color: #F59E0B; font-size: 11px; font-weight: 700; letter-spacing: 0.25em; text-transform: uppercase; margin: 0 0 24px;">Udaipur Sports Club</p>
          <h1 style="color: #0f172a; font-size: 26px; font-weight: 800; margin: 0 0 8px;">You're on the waitlist!</h1>
          <p style="color: #64748b; font-size: 14px; margin: 0 0 24px;">
            <strong>${eventTitle}</strong> is full right now, but you're <strong>#${position}</strong> on the waitlist.
            We'll email you instantly if a spot opens up.
          </p>
          <a href="${eventUrl}" style="display: block; background: #0f172a; color: white; text-align: center; padding: 14px; border-radius: 12px; font-weight: 700; font-size: 14px; text-decoration: none;">
            View Event →
          </a>
        </div>
      </div>
    `,
  });
}

// ── Email: Waitlist spot opened ───────────────────────────────────────
// Sent when a spot opens and it's this person's turn
export async function sendSpotOpenedEmail({
  to,
  userName,
  eventTitle,
  eventUrl,
}: {
  to:         string;
  userName:   string;
  eventTitle: string;
  eventUrl:   string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  await getResend()!.emails.send({
    from:    FROM,
    to:      [to],
    subject: `🎉 A spot just opened — ${eventTitle}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; background: #F9F7F4; padding: 40px 20px;">
        <div style="background: white; border-radius: 20px; padding: 40px; border: 1px solid #e7e5e4;">
          <p style="color: #F59E0B; font-size: 11px; font-weight: 700; letter-spacing: 0.25em; text-transform: uppercase; margin: 0 0 24px;">Udaipur Sports Club</p>
          <h1 style="color: #0f172a; font-size: 26px; font-weight: 800; margin: 0 0 8px;">A spot just opened for you! 🎉</h1>
          <p style="color: #64748b; font-size: 14px; margin: 0 0 8px;">
            Hey ${userName.split(" ")[0]}, a spot opened up in <strong>${eventTitle}</strong>.
          </p>
          <p style="color: #ef4444; font-size: 13px; font-weight: 600; margin: 0 0 24px;">
            Be quick — first person to RSVP gets the spot!
          </p>
          <a href="${eventUrl}" style="display: block; background: #F59E0B; color: white; text-align: center; padding: 16px; border-radius: 12px; font-weight: 700; font-size: 15px; text-decoration: none;">
            Claim Your Spot →
          </a>
        </div>
      </div>
    `,
  });
}
