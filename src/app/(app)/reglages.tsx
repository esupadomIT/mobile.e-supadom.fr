import { router } from 'expo-router';
import { Linking, Text, View } from 'react-native';
import { useState } from 'react';
import { AccountScreen } from '@/components/AccountScreen';
import { Card, Notice, PrimaryButton, SecondaryButton } from '@/components/ui';
import { Choice } from '@/components/forms';
import { useAppearance, type AppearanceMode } from '@/lib/appearance';
import { SITE_URL } from '@/config';
import { typography as t, useColors } from '@/theme';
export default function SettingsScreen(){
 const c=useColors();const appearance=useAppearance();const [selected,setSelected]=useState<AppearanceMode>(appearance.mode);
 const [notice,setNotice]=useState<{kind:'error'|'success';text:string}|null>(null);const [busy,setBusy]=useState(false);
 const save=async()=>{setBusy(true);try{await appearance.save(selected);setNotice({kind:'success',text:'Vos préférences ont été enregistrées.'});}catch{setNotice({kind:'error',text:'Vos préférences n’ont pas pu être enregistrées. Réessayez.'});}finally{setBusy(false);}};
 const open=async(url:string)=>{try{await Linking.openURL(url);}catch{setNotice({kind:'error',text:'Ce lien ne peut pas être ouvert pour le moment.'});}};
 return <AccountScreen title="Réglages & sécurité" subtitle="Une application adaptée à vos préférences.">
 <Card tone="info"><Text style={[t.cardTitle,{color:c.text}]}>Apparence</Text><View style={{gap:8}}>{([['light','Clair'],['dark','Sombre'],['system','Système']] as const).map(([mode,label])=><Choice key={mode} label={label} selected={selected===mode} onPress={()=>{setSelected(mode);setNotice(null);}}/>)}</View></Card>
 <Card><Text style={[t.cardTitle,{color:c.text}]}>Notifications</Text><Text style={[t.cardText,{color:c.muted}]}>Gérez les autorisations de notification dans les réglages de votre téléphone.</Text><SecondaryButton title="Ouvrir les réglages du téléphone" onPress={()=>void Linking.openSettings().catch(()=>setNotice({kind:'error',text:'Ouvrez les réglages de votre appareil pour gérer les notifications.'}))}/></Card>
 <Card><Text style={[t.cardTitle,{color:c.text}]}>Sécurité du compte</Text><SecondaryButton title="Modifier mon mot de passe" onPress={()=>router.push('/securite')}/></Card>
 <Card><Text style={[t.cardTitle,{color:c.text}]}>Confidentialité</Text><SecondaryButton title="Politique de confidentialité" onPress={()=>void open(SITE_URL+'/privacy-policy')}/><SecondaryButton title="Conditions d’utilisation" onPress={()=>void open(SITE_URL+'/cgvs')}/></Card>
 {notice?<Notice kind={notice.kind}>{notice.text}</Notice>:null}<PrimaryButton title="Enregistrer les préférences" onPress={()=>void save()} loading={busy}/>
 </AccountScreen>;
}
