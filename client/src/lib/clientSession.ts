const sessionKey = (publicId: string) => `voice-circle:${publicId}`;
const persistentKey = (publicId: string) => `voice-circle:client:${publicId}`;

export function saveClientSession(publicId: string, accessToken: string) {
  sessionStorage.setItem(sessionKey(publicId), accessToken);
  localStorage.setItem(persistentKey(publicId), accessToken);
}

export function getClientSession(publicId: string) {
  const token = sessionStorage.getItem(sessionKey(publicId)) ?? localStorage.getItem(persistentKey(publicId));
  if (token && !sessionStorage.getItem(sessionKey(publicId))) sessionStorage.setItem(sessionKey(publicId), token);
  return token;
}
