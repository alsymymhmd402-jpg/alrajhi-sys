import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client();

export async function verifyCustomerGoogleIdToken(idToken: string) {
  const audience = process.env.VITE_GOOGLE_CUSTOMER_WEB_CLIENT_ID;
  if (!audience) throw new Error("Google customer client ID is not configured.");
  const ticket = await googleClient.verifyIdToken({ idToken, audience });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || payload.email_verified !== true) throw new Error("Google account email is not verified.");
  return {
    subject: payload.sub,
    email: payload.email,
    name: payload.name?.trim() || payload.email.split("@")[0],
    picture: payload.picture || null,
  };
}
