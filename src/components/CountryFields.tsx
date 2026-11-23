import Ionicons from '@expo/vector-icons/Ionicons';
import type { CountryCode } from 'libphonenumber-js/min';
import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/forms';
import { Field } from '@/components/ui';
import { api } from '@/lib/api';
import {
  COUNTRIES,
  cleanPostal,
  countryOf,
  foreignCityOf,
  hasCityLookup,
  isPostalComplete,
  phonePlaceholder,
  postalRule,
  usesFrenchGeo,
} from '@/lib/country';
import { radius, useColors } from '@/theme';

/**
 * Champ téléphone avec drapeau et indicatif (comme react-phone-input-2 sur le
 * site). La saisie reste le numéro national ; utiliser phoneToStore() pour
 * l'envoyer au format du site.
 */
export function PhoneField({
  label,
  country,
  onCountryChange,
  value,
  onChangeText,
  error,
  autoComplete = 'tel',
}: {
  label: string;
  country: CountryCode;
  onCountryChange: (iso: CountryCode) => void;
  value: string;
  onChangeText: (v: string) => void;
  error?: string | null;
  autoComplete?: 'tel' | 'off';
}) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const current = countryOf(country);
  return (
    <>
      <Field
        label={label}
        placeholder={phonePlaceholder(country)}
        keyboardType="phone-pad"
        autoComplete={autoComplete}
        value={value}
        onChangeText={(v) => onChangeText(v.replace(/[^\d\s().-]/g, ''))}
        error={error}
        left={
          <Pressable
            onPress={() => setOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Pays : ${current.name}, indicatif +${current.dial}. Changer de pays`}
            hitSlop={6}
            style={({ pressed }) => [styles.flagBtn, { borderRightColor: c.border, opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={styles.flag}>{current.flag}</Text>
            <Text style={{ color: c.text, fontSize: 15 }}>+{current.dial}</Text>
            <Ionicons name="chevron-down" size={14} color={c.subtle} />
          </Pressable>
        }
      />
      <CountryPicker
        visible={open}
        value={country}
        onClose={() => setOpen(false)}
        onPick={(iso) => {
          setOpen(false);
          if (iso !== country) onCountryChange(iso);
        }}
      />
    </>
  );
}

function CountryPicker({ visible, value, onClose, onPick }: { visible: boolean; value: CountryCode; onClose: () => void; onPick: (iso: CountryCode) => void }) {
  const c = useColors();
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^\+/, '');
    if (!s) return COUNTRIES;
    return COUNTRIES.filter(
      (ct) => ct.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(s) || ct.dial.startsWith(s) || ct.iso.toLowerCase() === s,
    );
  }, [q]);
  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        setQ('');
        onClose();
      }}
      title="Choisir le pays"
    >
      <View style={[styles.search, { borderColor: c.border, backgroundColor: c.bg }]}>
        <Ionicons name="search" size={18} color={c.subtle} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Rechercher un pays ou un indicatif"
          placeholderTextColor={c.subtle}
          autoCorrect={false}
          style={{ flex: 1, color: c.text, fontSize: 16, paddingVertical: 10 }}
        />
      </View>
      <FlatList
        data={list}
        keyExtractor={(ct) => ct.iso}
        style={{ maxHeight: 420 }}
        keyboardShouldPersistTaps="handled"
        getItemLayout={(_, index) => ({ length: 50, offset: 50 * index, index })}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              setQ('');
              onPick(item.iso);
            }}
            style={({ pressed }) => [styles.option, { backgroundColor: pressed ? c.surfaceAlt : 'transparent' }]}
          >
            <Text style={styles.flag}>{item.flag}</Text>
            <Text style={{ flex: 1, color: c.text, fontSize: 16, fontWeight: item.iso === value ? '700' : '400' }}>{item.name}</Text>
            <Text style={{ color: c.muted, fontSize: 15 }}>+{item.dial}</Text>
            {item.iso === value ? <Ionicons name="checkmark" size={20} color={c.primary} /> : null}
          </Pressable>
        )}
      />
    </BottomSheet>
  );
}

/**
 * Code postal puis ville, comme sur le site : le format du code postal dépend
 * du pays (5 chiffres pour la France, 4 pour la Tunisie…) et la ville est
 * trouvée à partir du code postal (API Géo pour la France, ville non
 * modifiable ; zippopotam.us pour d'autres pays ; sinon saisie libre).
 */
export function PostalCityFields({
  country,
  postalCode,
  city,
  onChange,
  required = true,
}: {
  country: CountryCode;
  postalCode: string;
  city: string;
  onChange: (v: { postalCode: string; city: string }) => void;
  required?: boolean;
}) {
  const rule = postalRule(country);
  const geo = usesFrenchGeo(country);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);
  const star = required ? ' *' : '';

  const onPostal = (raw: string) => {
    const code = cleanPostal(country, raw);
    setError(null);
    const id = ++reqId.current;
    if (!isPostalComplete(country, code)) {
      onChange({ postalCode: code, city: geo ? '' : city });
      setLoading(false);
      if (code.length >= rule.max) setError(rule.hint);
      return;
    }
    onChange({ postalCode: code, city: geo ? '' : city });
    if (!hasCityLookup(country)) return;
    setLoading(true);
    void (geo ? api.cityOf(code) : foreignCityOf(country, code))
      .then((found) => {
        if (id !== reqId.current) return;
        if (found) onChange({ postalCode: code, city: found });
        else if (geo) setError('Aucune ville trouvée.');
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
  };

  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Field
          label={`Code postal${star}`}
          placeholder={rule.placeholder}
          keyboardType={rule.numeric ? 'number-pad' : 'default'}
          autoCapitalize="characters"
          autoComplete="postal-code"
          maxLength={rule.max}
          value={postalCode}
          onChangeText={onPostal}
          error={error}
        />
      </View>
      <View style={{ flex: 1.3 }}>
        <Field
          label={`Ville${star}`}
          placeholder={loading ? 'Recherche…' : geo ? 'Selon le code postal' : ''}
          value={city}
          editable={!geo}
          onChangeText={(v) => onChange({ postalCode, city: v })}
          autoComplete="postal-address-locality"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  flagBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 10, marginRight: 10, borderRightWidth: 1, alignSelf: 'stretch' },
  flag: { fontSize: 22 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12 },
  option: { height: 50, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6 },
});
