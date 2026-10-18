import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { loadAeroConnectionMode, saveAeroConnectionMode } from "../app/connectionMode";
import { LanguageSelect, useI18n } from "../app/i18n";
import type { AeroConnectionMode, DesktopHost } from "../app/desktop";
import { showError } from "../app/errorStore";
import { AeroIcon, type AeroIconName } from "../components/AeroIcon";
import { Button, Dialog, Select } from "../components/ui";
import styles from "./AeroPages.module.css";

export function AeroSettingsView(props: { host: DesktopHost }) {
  const { t } = useI18n();
  const [openAtLogin, setOpenAtLogin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [connectionMode, setConnectionMode] = useState<AeroConnectionMode>(loadAeroConnectionMode);
  const [connectionActive, setConnectionActive] = useState(false);
  const [appVersion, setAppVersion] = useState("");
  const [dialog, setDialog] = useState<"updates" | "terms" | "privacy" | null>(null);

  const refresh = useCallback(async () => {
    const [settings, activeConnection] = await Promise.all([
      props.host.settings.get(),
      props.host.auth.activeConnection().catch(() => null),
    ]);
    setOpenAtLogin(settings.openAtLogin);
    setConnectionMode(loadAeroConnectionMode());
    setConnectionActive(activeConnection !== null);
  }, [props.host]);

  useEffect(() => { void refresh().catch(showError); }, [refresh]);

  useEffect(() => {
    let disposed = false;
    void props.host.appVersion().then((version) => {
      if (!disposed) setAppVersion(version);
    }).catch(() => {});
    return () => { disposed = true; };
  }, [props.host]);

  const toggleOpenAtLogin = async () => {
    const next = !openAtLogin;
    setBusy(true);
    setOpenAtLogin(next);
    try {
      await props.host.settings.setOpenAtLogin(next);
    } catch (error) {
      setOpenAtLogin(!next);
      showError(error);
    } finally {
      setBusy(false);
    }
  };

  const changeConnectionMode = (mode: AeroConnectionMode) => {
    setConnectionMode(mode);
    saveAeroConnectionMode(mode);
  };

  const row = (title: string, icon: AeroIconName, trailing: ReactNode, subtitle?: string, onClick?: () => void) => (
    <div
      className={`${styles.settingRow} ${onClick ? styles.settingRowClickable : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <span className={styles.settingIcon}><AeroIcon name={icon} size={22} /></span>
      <span className={styles.settingCopy}><strong>{title}</strong>{subtitle && <small>{subtitle}</small>}</span>
      <span className={styles.settingTrailing}>{trailing}</span>
    </div>
  );

  const toggle = (checked: boolean, disabled: boolean, label: string, onClick: () => void) => (
    <button type="button" className={`switch ${checked ? "on" : ""}`} role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={onClick} />
  );

  return (
    <section className={styles.page}>
      <header className={styles.pageHeader}><h1>{t("Settings")}</h1></header>
      <div className={styles.listBody}>
        <h2 className={styles.listSectionTitle}>{t("General")}</h2>
        <div className={styles.listCard}>
          {row(t("Language"), "language", <LanguageSelect />)}
          <div className={styles.rowDivider} />
          {row(t("Open at login"), "power_settings_new", toggle(openAtLogin, busy, t("Open at login"), () => void toggleOpenAtLogin()), t("Start the app automatically when you sign in to Windows."))}
        </div>

        <h2 className={styles.listSectionTitle}>{t("Connection Settings")}</h2>
        <div className={styles.listCard}>
          {row(
            t("Connection Mode"),
            "route",
            <Select<AeroConnectionMode>
              inline
              value={connectionMode}
              disabled={busy || connectionActive || props.host.platform !== "win32"}
              options={[
                { value: "tun", label: t("TUN (device-wide)") },
                { value: "system_proxy", label: t("System Proxy") },
              ]}
              onChange={changeConnectionMode}
            />,
          )}
        </div>

        <h2 className={styles.listSectionTitle}>{t("Updates & Support")}</h2>
        <div className={styles.listCard}>
          {row(t("Check for Updates"), "system_update", <AeroIcon name="keyboard_arrow_right" size={22} />, undefined, () => setDialog("updates"))}
          <div className={styles.rowDivider} />
          {row(t("Terms of Service"), "description", <AeroIcon name="keyboard_arrow_right" size={22} />, undefined, () => setDialog("terms"))}
          <div className={styles.rowDivider} />
          {row(t("Privacy Policy"), "security", <AeroIcon name="keyboard_arrow_right" size={22} />, undefined, () => setDialog("privacy"))}
        </div>

        <div className={styles.pageBottomSpace} />
      </div>

      {dialog !== null && (
        <Dialog onClose={() => setDialog(null)}>
          {dialog === "updates" ? (
            <>
              <h3>{t("Version Update")}</h3>
              <div className={styles.updateDialogBody}>
                <div className={styles.updateVersionCard}>
                  <AeroIcon name="info" size={36} />
                  <strong>{t("Current Version: {version}", { version: appVersion || "—" })}</strong>
                </div>
                <p className="dialog-message">{t("Automatic update check is not configured in this build. Please download the latest release from the official website.")}</p>
              </div>
              <div className="row-actions dialog-actions">
                <Button variant="primary" onClick={() => setDialog(null)}>{t("Confirm")}</Button>
              </div>
            </>
          ) : dialog === "terms" ? (
            <>
              <h3>{t("Terms of Service")}</h3>
              <div className={styles.legalDialogContent}>
                <p>{t("1. Users must comply with the laws and regulations applicable in their location and the server’s location.")}</p>
                <p>{t("2. This service is intended only for lawful academic research, cross-border business, and privacy protection.")}</p>
                <p>{t("3. Using this service for cyberattacks, traffic abuse, or infringement of others’ legal rights is prohibited.")}</p>
              </div>
              <div className="row-actions dialog-actions">
                <Button onClick={() => setDialog(null)}>{t("Got it")}</Button>
              </div>
            </>
          ) : (
            <>
              <h3>{t("Privacy Policy")}</h3>
              <div className={styles.legalDialogContent}>
                <p>{t("AeroVPN strictly follows a Strict No-Logs Policy:")}</p>
                <p>{t("• We never record or store users’ browsing history, traffic destinations, or DNS queries.")}</p>
                <p>{t("• Military-grade ChaCha20-Poly1305 / AES-256-GCM encryption protects every connection.")}</p>
              </div>
              <div className="row-actions dialog-actions">
                <Button variant="primary" onClick={() => setDialog(null)}>{t("Confirm")}</Button>
              </div>
            </>
          )}
        </Dialog>
      )}
    </section>
  );
}
