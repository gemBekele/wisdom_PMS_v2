import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { configAPI } from '@/lib/api';

interface ConfigItem {
  value: string;
  label: string;
}

interface AppConfig {
  taskTypes: ConfigItem[];
  kpiCategories: ConfigItem[];
  positions: ConfigItem[];
  periodOptions: string[];
  taskTypeToKpiMap: Record<string, string>;
}

const defaultConfig: AppConfig = {
  taskTypes: [],
  kpiCategories: [],
  positions: [],
  periodOptions: ['FY-2026-27'],
  taskTypeToKpiMap: {},
};

const ConfigContext = createContext<AppConfig>(defaultConfig);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(defaultConfig);

  useEffect(() => {
    configAPI.getConfig().then((res) => {
      if (res.success && res.data) {
        setConfig(res.data);
      }
    }).catch(() => {});
  }, []);

  return (
    <ConfigContext.Provider value={config}>
      {children}
    </ConfigContext.Provider>
  );
}

export const useConfig = () => useContext(ConfigContext);
