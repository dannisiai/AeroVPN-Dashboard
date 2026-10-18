import type { AeroConnectionMode } from "../../../src/shared/ipc";

const AERO_CONNECTION_MODE_KEY = "aerovpn.connection-mode";

export function loadAeroConnectionMode(): AeroConnectionMode {
  return window.localStorage.getItem(AERO_CONNECTION_MODE_KEY) === "system_proxy"
    ? "system_proxy"
    : "tun";
}

export function saveAeroConnectionMode(mode: AeroConnectionMode): void {
  window.localStorage.setItem(AERO_CONNECTION_MODE_KEY, mode);
}
