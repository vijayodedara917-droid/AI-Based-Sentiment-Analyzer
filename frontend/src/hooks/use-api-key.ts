import { useState, useEffect } from "react";

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string | null>(() => {
    return localStorage.getItem("sa_api_key");
  });

  const setApiKey = (key: string | null) => {
    if (key) {
      localStorage.setItem("sa_api_key", key);
    } else {
      localStorage.removeItem("sa_api_key");
    }
    setApiKeyState(key);
  };

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "sa_api_key") {
        setApiKeyState(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return { apiKey, setApiKey, hasApiKey: !!apiKey };
}
