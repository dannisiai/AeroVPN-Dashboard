import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { navigate } from "../app/context";
import { loadAeroConnectionMode, saveAeroConnectionMode } from "../app/connectionMode";
import { LanguageSelect, useI18n } from "../app/i18n";
import type { AeroConnectionMode, DesktopHost } from "../app/desktop";
import { showError } from "../app/errorStore";
import { AeroIcon, type AeroIconName } from "../components/AeroIcon";
import { Select } from "../components/ui";
import styles from "./AeroPages.module.css";

export function AeroSettingsView(props: { host: DesktopHost }) {
  const { t } = useI18n();
  const [openAtLogin, setOpenAtLogin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [connectionMode, setConnectionMode] = useState<AeroConnectionMode>(loadAeroConnectionMode);
  const [connectionActive, setConnectionActive] = useState(false);

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
            connectionMode === "system_proxy"
              ? t("Windows system proxy routes supported apps through AeroVPN. Apps that ignore system proxy settings are not covered.")
              : t("Connections use the managed TUN configuration."),
          )}
          <div className={styles.rowDivider} />
          {row(t("Kill Switch"), "shield", toggle(false, true, t("Kill Switch"), () => {}), t("This AeroVPN desktop build does not expose a kill-switch control."))}
          <div className={styles.rowDivider} />
          {row(t("Auto Connect"), "power_settings_new", toggle(false, true, t("Auto Connect"), () => {}), t("Automatic tunnel startup is not exposed by this build."))}
          <div className={styles.rowDivider} />
          {row(t("Bypass Local LAN"), "route", toggle(true, true, t("Bypass Local LAN"), () => {}), t("Private network traffic is routed directly in managed connection mode."))}
        </div>

        <h2 className={styles.listSectionTitle}>{t("Updates & Support")}</h2>
        <div className={styles.listCard}>
          {row(t("Check for Updates"), "system_update", <AeroIcon name="keyboard_arrow_right" size={22} />, undefined, () => navigate("settings/app"))}
          <div className={styles.rowDivider} />
          {row(t("Terms of Service"), "description", <AeroIcon name="keyboard_arrow_right" size={22} />, undefined, () => navigate("settings/app"))}
          <div className={styles.rowDivider} />
          {row(t("Privacy Policy"), "security", <AeroIcon name="keyboard_arrow_right" size={22} />, undefined, () => navigate("settings/app"))}
          <div className={styles.rowDivider} />
          {row(t("About"), "info", <AeroIcon name="keyboard_arrow_right" size={22} />, undefined, () => navigate("settings/app"))}
        </div>

        <div className={styles.pageBottomSpace} />
      </div>
    </section>
  );
}
