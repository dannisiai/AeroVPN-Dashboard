import { useCallback, useEffect, useState } from "react";

import { useI18n } from "../app/i18n";
import type { AeroAccountSnapshot, AeroConnectSessionSnapshot, AeroRegionSnapshot, DesktopHost } from "../app/desktop";
import { AeroIcon } from "../components/AeroIcon";
import { Button, Dialog } from "../components/ui";
import aeroAvatar from "../assets/aero-avatar.png";
import styles from "./AeroPages.module.css";

export function AeroAccountView(props: {
  host: DesktopHost;
  account: AeroAccountSnapshot;
  onAccountUpdated?: (account: AeroAccountSnapshot) => void;
  onLogout: () => Promise<void>;
}) {
  const { t, language } = useI18n();
  const [account, setAccount] = useState(props.account);
  const [sessions, setSessions] = useState<AeroConnectSessionSnapshot[]>([]);
  const [regions, setRegions] = useState<AeroRegionSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshError, setRefreshError] = useState("");
  const [busySessionId, setBusySessionId] = useState<string | null>(null);
  const [showLogout, setShowLogout] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => setAccount(props.account), [props.account]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setRefreshError("");
    const results = await Promise.allSettled([
      props.host.auth.refreshAccount(),
      props.host.auth.listConnectSessions(),
      props.host.auth.getRegions(),
    ]);
    const errors: string[] = [];
    if (results[0].status === "fulfilled") {
      setAccount(results[0].value);
      props.onAccountUpdated?.(results[0].value);
    }
    else errors.push(results[0].reason instanceof Error ? results[0].reason.message : String(results[0].reason));
    if (results[1].status === "fulfilled") setSessions(results[1].value);
    else errors.push(results[1].reason instanceof Error ? results[1].reason.message : String(results[1].reason));
    if (results[2].status === "fulfilled") setRegions(results[2].value);
    else errors.push(results[2].reason instanceof Error ? results[2].reason.message : String(results[2].reason));
    if (errors.length > 0) setRefreshError(errors.join("\n"));
    setLoading(false);
  }, [props.host, props.onAccountUpdated]);

  useEffect(() => { void refresh(); }, [refresh]);

  const plan = account.plan;
  const active = plan?.status === "active" && plan.expiresAt > Math.floor(Date.now() / 1000);
  const remainingDays = plan === null ? 0 : Math.max(0, Math.floor((plan.expiresAt * 1000 - Date.now()) / 86_400_000));
  const validUntil = plan === null || plan.expiresAt <= 0
    ? "--"
    : new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(new Date(plan.expiresAt * 1000));
  const activeSessions = sessions.filter((session) => !session.revoked && session.expiresAt > Math.floor(Date.now() / 1000));
  const activeDevices = new Set(activeSessions.map((session) => session.deviceId)).size;

  async function logout() {
    setLogoutBusy(true);
    setLogoutError("");
    try {
      await props.onLogout();
      setShowLogout(false);
      setLogoutBusy(false);
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : String(error));
      setLogoutBusy(false);
    }
  }

  async function revoke(sessionId: string) {
    setBusySessionId(sessionId);
    setRefreshError("");
    try {
      await props.host.auth.revokeConnectSession(sessionId);
      await refresh();
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusySessionId(null);
    }
  }

  const formatDateTime = (seconds: number) => seconds <= 0
    ? "--"
    : new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(seconds * 1000));

  return (
    <section className={styles.page}>
      <header className={`${styles.pageHeader} ${styles.accountHeader}`}>
        <h1>{t("Account & Subscription")}</h1>
        <button type="button" className={styles.accountRefresh} disabled={loading} onClick={() => void refresh()} aria-label={t("Refresh account")}>
          <AeroIcon name="sync_rounded" size={19} />
        </button>
      </header>
      <div className={styles.accountBody}>
        <div className={styles.accountProfile}>
          <img className={styles.avatarPlaceholder} src={aeroAvatar} alt="" />
          <div className={styles.profileCopy}>
            <strong>{account.email}</strong>
            <span className={`${styles.expiredStatus} ${active ? styles.activeStatus : ""}`}>
              <i />{active ? t("Subscription active") : plan === null ? t("Not subscribed") : t("Expired")}
            </span>
          </div>
        </div>

        <h2 className={styles.sectionCaption}>{t("Current Subscription")}</h2>
        <section className={styles.subscriptionCard}>
          <div className={styles.subscriptionTitle}>
            <strong>{plan?.name || t("Not subscribed")}</strong>
            <span className={styles.daysBadge}>{active ? remainingDays : 0} {t("days left")}</span>
          </div>
          <div className={styles.subscriptionRow}>
            <span>{t("Valid until")}</span><strong>{validUntil}</strong>
          </div>
          <div className={styles.subscriptionRow}>
            <span>{t("Simultaneous devices")}</span>
            <strong>{plan === null ? "0 / 0" : `${activeDevices} / ${plan.maxDevices}`}</strong>
          </div>
          {plan?.trafficGb !== null && plan?.trafficGb !== undefined && plan.trafficGb > 0 && (
            <div className={styles.subscriptionRow}>
              <span>{t("Remaining Data")}</span>
              <strong>{plan.trafficUsedGb === null ? "—" : `${Math.max(0, plan.trafficGb - plan.trafficUsedGb).toFixed(1)} GB`}</strong>
            </div>
          )}
          {!active && <div className={styles.noPlanHint}>{t("No active subscription. Please purchase a plan before connecting.")}</div>}
        </section>

        <div className={styles.sessionHeading}>
          <h2 className={styles.sectionCaption}>{t("Active Connections")}</h2>
          <span>{loading ? t("Loading...") : `${activeSessions.length}`}</span>
        </div>
        {refreshError && <div className={styles.accountError} role="status">{refreshError}</div>}
        <section className={styles.sessionList}>
          {activeSessions.length === 0 ? (
            <p className={styles.sessionEmpty}>{loading ? t("Loading...") : t("No active connections")}</p>
          ) : activeSessions.map((session) => {
            const region = regions.find((item) => item.id === session.regionId);
            const isBusy = busySessionId === session.sessionId;
            return (
              <div className={styles.sessionRow} key={session.sessionId}>
                <div className={styles.sessionCopy}>
                  <strong>{region?.flagEmoji ?? "🌐"} {region?.name ?? session.regionId} · {session.protocol.toUpperCase()}</strong>
                  <span>{session.currentDevice ? t("This device") : session.deviceId}</span>
                  <small>{t("Connected at")}: {formatDateTime(session.issuedAt)} · {t("Expires")}: {formatDateTime(session.expiresAt)}</small>
                </div>
                <button
                  type="button"
                  className={styles.revokeSessionButton}
                  disabled={isBusy}
                  onClick={() => void revoke(session.sessionId)}
                >
                  {isBusy ? t("Sending...") : t("Disconnect")}
                </button>
              </div>
            );
          })}
        </section>

        <button type="button" className={styles.logoutButton} onClick={() => setShowLogout(true)}>
          <AeroIcon name="logout" size={18} />{t("Log Out")}
        </button>
      </div>

      {showLogout && (
        <Dialog onClose={() => { if (!logoutBusy) setShowLogout(false); }}>
          <h2>{t("Log Out")}</h2>
          <div className="dialog-message">
            <p>{t("Sign out of your AeroVPN account?")}</p>
            {logoutError && <p role="alert">{logoutError}</p>}
          </div>
          <div className="row-actions dialog-actions">
            <Button disabled={logoutBusy} onClick={() => setShowLogout(false)}>{t("Cancel")}</Button>
            <Button variant="danger" disabled={logoutBusy} onClick={() => void logout()}>
              {logoutBusy ? t("Sending...") : t("Log Out")}
            </Button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
