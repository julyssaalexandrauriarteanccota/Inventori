"use client";

import * as React from "react";
import dynamic from "next/dynamic";

const LazySettingsDialog = dynamic(
  () =>
    import("@/components/settings-dialog").then(
      (module) => module.SettingsDialog,
    ),
  { ssr: false },
);

export type QuickSettingsSectionId =
  | "preferencias"
  | "perfil"
  | "copias"
  | "soporte";

type SettingsDialogContextValue = {
  isOpen: boolean;
  activeSection: QuickSettingsSectionId;
  openSettings: (section?: QuickSettingsSectionId) => void;
  closeSettings: () => void;
};

const SettingsDialogContext =
  React.createContext<SettingsDialogContextValue | null>(null);

export function SettingsDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeSection, setActiveSection] =
    React.useState<QuickSettingsSectionId>("preferencias");

  const openSettings = React.useCallback(
    (section: QuickSettingsSectionId = "preferencias") => {
      setActiveSection(section);
      setIsOpen(true);
    },
    [],
  );

  const closeSettings = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  const contextValue = React.useMemo<SettingsDialogContextValue>(
    () => ({
      isOpen,
      activeSection,
      openSettings,
      closeSettings,
    }),
    [activeSection, closeSettings, isOpen, openSettings],
  );

  return (
    <SettingsDialogContext.Provider value={contextValue}>
      {children}
      {isOpen ? (
        <LazySettingsDialog
          open={isOpen}
          onOpenChangeAction={setIsOpen}
          initialSection={activeSection}
          showTrigger={false}
        />
      ) : null}
    </SettingsDialogContext.Provider>
  );
}

export function useSettingsDialog() {
  const context = React.useContext(SettingsDialogContext);

  if (!context) {
    throw new Error(
      "useSettingsDialog must be used within a SettingsDialogProvider.",
    );
  }

  return context;
}
