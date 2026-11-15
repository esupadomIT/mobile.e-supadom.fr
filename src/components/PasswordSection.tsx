import { useState } from 'react';
import { router } from 'expo-router';
import { Section } from '@/components/forms';
import { Field, Notice, PrimaryButton } from '@/components/ui';
import { api } from '@/lib/api';
const PASSWORD_ERRORS: Record<string, string> = {
  'Incorrect current password': 'Mot de passe actuel incorrect.',
  'Passwords do not match': 'Les deux mots de passe ne correspondent pas.',
  'Password must be at least 8 characters': 'Le mot de passe doit contenir au moins 8 caractères.',
};

export function PasswordSection({ userId, social, email }: { userId?: number; social: boolean; email: string }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  if (social) {
    return (
      <Section title="Mot de passe" subtitle="Vous vous connectez avec Google : pour créer un mot de passe, utilisez « Mot de passe oublié ».">
        <PrimaryButton title="Recevoir un lien par e-mail" onPress={() => router.push({ pathname: '/forgot-password', params: { email } })} />
      </Section>
    );
  }

  const submit = async () => {
    if (!userId) return;
    if (next.length < 8) return setNotice({ kind: 'error', text: PASSWORD_ERRORS['Password must be at least 8 characters'] });
    if (next !== confirm) return setNotice({ kind: 'error', text: PASSWORD_ERRORS['Passwords do not match'] });
    setBusy(true);
    try {
      await api.updatePassword({ id: userId, currentPassword: current, newPassword: next, confirmNewPassword: confirm });
      setCurrent('');
      setNext('');
      setConfirm('');
      setNotice({ kind: 'success', text: 'Mot de passe modifié.' });
    } catch (e) {
      const msg = (e as Error).message;
      setNotice({ kind: 'error', text: PASSWORD_ERRORS[msg] ?? msg });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Mot de passe">
      <Field label="Mot de passe actuel" value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" />
      <Field label="Nouveau mot de passe (8 caractères min.)" value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" />
      <Field label="Confirmer le nouveau mot de passe" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" />
      {notice ? <Notice kind={notice.kind}>{notice.text}</Notice> : null}
      <PrimaryButton title="Changer le mot de passe" onPress={submit} loading={busy} disabled={!current || !next || !confirm} />
    </Section>
  );
}

