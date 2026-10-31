// An invite link opened while signed out. The join screen stores it and the
// root layout reopens it right after sign-in (the same job ?next= does on the web).
let pendingToken: string | null = null;

export function setPendingInvite(token: string) {
  pendingToken = token;
}

export function takePendingInvite(): string | null {
  const token = pendingToken;
  pendingToken = null;
  return token;
}
