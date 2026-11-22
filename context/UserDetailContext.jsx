import { createContext } from "react";

/** @type {import("react").Context<{ userDetail: any; setUserDetail: (value: any) => void }>} */
export const UserDetailContext = createContext({
  userDetail: null,
  setUserDetail: (_value) => {},
});
