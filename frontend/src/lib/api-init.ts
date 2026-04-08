import { setAuthTokenGetter } from "@/api-client";

export function initApi() {
  setAuthTokenGetter(() => {
    return localStorage.getItem("sa_api_key");
  });
}
