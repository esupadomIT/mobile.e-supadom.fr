import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { typography as t, useColors } from '@/theme';
export function AccountScreen({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
 const c = useColors();
 return <View style={{flex:1,backgroundColor:c.bg}}><Stack.Screen options={{headerShown:false}}/><AppHeader/><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}><View style={{gap:6}}><Text accessibilityRole="header" style={[t.title,{color:c.text}]}>{title}</Text><Text style={[t.body,{color:c.muted}]}>{subtitle}</Text></View>{children}</ScrollView></View>;
}
const styles=StyleSheet.create({content:{padding:20,gap:18,paddingBottom:40,width:'100%',maxWidth:760,alignSelf:'center'}});
