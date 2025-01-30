import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

//This layout page checks Auth status...  
export default async function AddProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/sign-in');
  }

  return <>{children}</>;
}