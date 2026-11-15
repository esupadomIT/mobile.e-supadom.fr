import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
export type AppearanceMode = 'light' | 'dark' | 'system';
const Context = createContext<{mode:AppearanceMode; save:(mode:AppearanceMode)=>Promise<void>}>({mode:'system',save:async()=>{}});
export function AppearanceProvider({children}:{children:ReactNode}) {
 const [mode,setMode]=useState<AppearanceMode>('system');
 useEffect(()=>{let active=true;void SecureStore.getItemAsync('esupadom.appearance').then(value=>{if(active && (value==='light'||value==='dark'))setMode(value);}).catch(()=>undefined);return()=>{active=false;};},[]);
 const save=async(value:AppearanceMode)=>{await SecureStore.setItemAsync('esupadom.appearance',value);setMode(value);};
 return <Context.Provider value={{mode,save}}>{children}</Context.Provider>;
}
export const useAppearance=()=>useContext(Context);
