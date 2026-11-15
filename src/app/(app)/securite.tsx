import { AccountScreen } from '@/components/AccountScreen';
import { PasswordSection } from '@/components/PasswordSection';
import { useFullUser } from '@/lib/home';
import { Notice, SecondaryButton } from '@/components/ui';
import { ActivityIndicator } from 'react-native';
import { useColors } from '@/theme';
export default function SecurityScreen(){const c=useColors();const query=useFullUser();return <AccountScreen title="Sécurité du compte" subtitle="Choisissez un mot de passe unique pour votre espace.">{query.isLoading?<ActivityIndicator color={c.primary}/>:query.error?<><Notice kind="error">Votre profil est momentanément indisponible.</Notice><SecondaryButton title="Réessayer" onPress={()=>void query.refetch()}/></>:query.data?<PasswordSection userId={query.data.id} social={!!query.data.isSocialAuth} email={query.data.email}/>:null}</AccountScreen>;}
