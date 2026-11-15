import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AccountScreen } from '@/components/AccountScreen';
import { Card, Notice, PrimaryButton, SecondaryButton } from '@/components/ui';
import { api, type Reglement } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useMe } from '@/lib/home';
import { exportReleve } from '@/lib/releve';
import { fonts, radius, typography as t, useColors } from '@/theme';

/**
 * Maquette Figma « Paiements · Élève, Parent » : écran « Mes paiements ».
 * Données réelles : solde d'heures (/v1/auth/me) et historique (/reglements).
 * « Exporter le relevé (PDF) » : même relevé que le bouton « Export PDF » de « Mes règlements » sur le site.
 * La carte enregistrée n'existe pas sur le site : elle n'est pas affichée.
 */

const euros = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
function echeanceLabel(v: string | null | undefined) {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('fr-FR');
}

const day = (iso: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

function hoursLabel(h: number | null | undefined) {
  if (typeof h !== 'number') return '—';
  const whole = Math.floor(h);
  const min = Math.round((h - whole) * 60);
  return min ? `${whole}h${String(min).padStart(2, '0')}` : `${whole}h`;
}

export default function PaymentsScreen() {
  const c = useColors();
  const { user } = useAuth();
  const me = useMe();
  const email = me.data?.email ?? user?.email;
  const history = useQuery({
    queryKey: ['reglements', email],
    queryFn: () => api.reglements(email!),
    enabled: !!email,
  });
  const paid = (history.data?.paiements ?? []).filter((p) => p.status === 'Approved');
  const pending = (history.data?.paiements ?? []).filter((p) => p.status === 'Pending');
  const last = paid[0];
  const all = history.data?.paiements ?? [];
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);
  const onExport = async () => {
    setExporting(true);
    setExportError(false);
    try {
      await exportReleve(all, { firstName: me.data?.firstName, lastName: me.data?.lastName, email });
    } catch {
      setExportError(true);
    } finally {
      setExporting(false);
    }
  };

  return (
    <AccountScreen title="Mes paiements" subtitle="Élève & Parent · Vos cours en toute sérénité.">
      <Card tone="info">
        <Text style={[t.cardTitle, { color: c.text }]}>Votre solde d’heures</Text>
        <Text style={[t.cardText, { color: c.muted }]}>
          {hoursLabel(me.data?.totalHours)} disponibles{me.data?.firstName ? ` · Compte de ${me.data.firstName}` : ''}
        </Text>
        <Text style={[styles.balance, { color: c.text }]}>{hoursLabel(me.data?.totalHours)}</Text>
        {echeanceLabel(me.data?.echeanceDate) ? (
          <Text style={[t.cardText, { color: c.muted }]}>Date d’échéance : {echeanceLabel(me.data?.echeanceDate)}</Text>
        ) : null}
        <PrimaryButton title="Recharger mon compte" onPress={() => router.push('/recharge')} />
      </Card>

      {history.isLoading ? <ActivityIndicator color={c.primary} accessibilityLabel="Chargement des paiements" /> : null}

      {history.isError ? (
        <View style={{ gap: 12 }}>
          <Notice kind="error">Votre historique de paiements est momentanément indisponible.</Notice>
          <SecondaryButton title="Réessayer" onPress={() => void history.refetch()} />
        </View>
      ) : null}

      {last ? (
        <Card>
          <Text style={[t.cardTitle, { color: c.text }]}>Dernière recharge</Text>
          <Text style={[t.cardText, { color: c.muted }]}>
            {euros(last.amount)} · Payée le {day(last.createdAt)}
          </Text>
          {last.subject ? <Text style={[t.captionRegular, { color: c.subtle }]}>{last.subject}</Text> : null}
        </Card>
      ) : null}

      {pending.length ? (
        <Card>
          <Text style={[t.cardTitle, { color: c.text }]}>En attente de paiement</Text>
          {pending.map((p) => (
            <PaymentRow key={p.id} p={p} />
          ))}
          <Text style={[t.captionRegular, { color: c.muted }]}>Le lien de paiement a été envoyé par e-mail.</Text>
        </Card>
      ) : null}

      {!history.isLoading && !history.isError ? (
        <View style={{ gap: 10 }}>
          <Text accessibilityRole="header" style={[t.cardTitle, { color: c.text }]}>
            Historique
          </Text>
          {paid.length === 0 ? (
            <Card>
              <Text style={[t.cardText, { color: c.muted }]}>Aucun paiement enregistré pour le moment.</Text>
            </Card>
          ) : (
            <Card>
              {paid.map((p, i) => (
                <View key={p.id} style={i ? [styles.sep, { borderTopColor: c.border }] : undefined}>
                  <PaymentRow p={p} />
                </View>
              ))}
            </Card>
          )}
          {all.length ? (
            <SecondaryButton
              title="Exporter le relevé (PDF)"
              icon={<Ionicons name="download-outline" size={18} color={c.link} />}
              onPress={() => void onExport()}
              loading={exporting}
            />
          ) : null}
          {exportError ? (
            <Notice kind="error">Le relevé n’a pas pu être généré. Merci de réessayer dans quelques instants.</Notice>
          ) : null}
        </View>
      ) : null}
    </AccountScreen>
  );
}

function PaymentRow({ p }: { p: Reglement }) {
  const c = useColors();
  const ok = p.status === 'Approved';
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: ok ? c.accentSoft : c.surfaceAlt }]}>
        <Ionicons name={ok ? 'checkmark' : 'time-outline'} size={16} color={ok ? c.onAccent : c.link} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[t.cardText, { color: c.text, fontFamily: fonts.semibold }]}>{euros(p.amount)}</Text>
        <Text style={[t.captionRegular, { color: c.muted }]} numberOfLines={1}>
          {day(p.createdAt)}
          {p.subject ? ` · ${p.subject}` : ''}
        </Text>
      </View>
      <View style={[styles.badge, { backgroundColor: ok ? c.accentSoft : c.surfaceAlt }]}>
        <Text style={[t.caption, { color: ok ? c.onAccent : c.link }]}>{ok ? 'Payé' : 'En attente'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  balance: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 38, marginVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  rowIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth * 2 },
});
