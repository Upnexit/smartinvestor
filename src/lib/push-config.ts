// VAPID public key is safe to expose in the client bundle by design
// (it's the "public" half of the ECDSA keypair used to sign push requests).
// The matching private key lives only in the server as VAPID_PRIVATE_KEY.
export const VAPID_PUBLIC_KEY =
  "BLyJQavtrdF4MG_9ajUF0pb_ZBkfNWPXTy2G0PY02rzd_oJhVnT3xo37TxIny-oEA8V05zXo7MeQeSq16yZDSvo";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}
