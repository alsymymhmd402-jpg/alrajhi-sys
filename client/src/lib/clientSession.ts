const sessionKey = (publicId: string) => `voice-circle:${publicId}`;
const persistentKey = (publicId: string) => `voice-circle:client:${publicId}`;
const inviteKey = (inviteCode: string) => `voice-circle:invite:${inviteCode}`;

export function saveClientSession(publicId: string, accessToken: string) {
  sessionStorage.setItem(sessionKey(publicId), accessToken);
  localStorage.setItem(persistentKey(publicId), accessToken);
}

export function getClientSession(publicId: string) {
  const token = sessionStorage.getItem(sessionKey(publicId)) ?? localStorage.getItem(persistentKey(publicId));
  if (token && !sessionStorage.getItem(sessionKey(publicId))) sessionStorage.setItem(sessionKey(publicId), token);
  return token;
}

export function saveInviteSession(inviteCode: string, publicId: string) {
  localStorage.setItem(inviteKey(inviteCode), publicId);
}

export function getInviteSession(inviteCode: string) {
  const publicId = localStorage.getItem(inviteKey(inviteCode));
  return publicId && getClientSession(publicId) ? publicId : null;
}
