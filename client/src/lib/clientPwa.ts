export function isClientExperiencePath(pathname: string) {
  return /^\/(invite|client|chat)\//.test(pathname);
}

export function getClientAppStartPath(pathname: string) {
  const match = pathname.match(/^\/client\/([^/]+)(?:\/(?:chat|privacy))?$/);
  return match ? `/client/${match[1]}` : "";
}
