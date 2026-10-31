import { Redirect } from 'expo-router';
import { FindTeacherWizard } from '@/components/find-teacher/FindTeacherWizard';
import { useAuth } from '@/lib/auth';

export default function FindTeacherScreen() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user?.role !== 'STUDENT') return <Redirect href="/accueil" />;
  return <FindTeacherWizard />;
}
