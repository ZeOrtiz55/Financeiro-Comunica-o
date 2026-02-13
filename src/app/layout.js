'use client'
import { Poppins } from "next/font/google";
import "./globals.css";
import { useEffect, useState } from "react"; 
import { supabase } from "@/lib/supabase";
import NotificationSystem from "@/components/NotificationSystem"; 

const poppins = Poppins({ 
  subsets: ["latin"], 
  weight: ["400", "500", "700", "900"],
  variable: '--font-poppins',
});

export default function RootLayout({ children }) {
  const [userProfile, setUserProfile] = useState(null);
  const [isMounted, setIsMounted] = useState(false); // NOVO: Controle de montagem

  useEffect(() => {
    setIsMounted(true); // Indica que o componente já está no navegador

    const aplicarTemaEPerfil = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from('financeiro_usu')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (data) {
          setUserProfile(data);
          if (data.tema) {
            document.documentElement.setAttribute('data-theme', data.tema);
          }
        }
      }
    };
    aplicarTemaEPerfil();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      aplicarTemaEPerfil();
    });

    return () => subscription?.unsubscribe();
  }, []);

  return (
    <html lang="pt-br" className={poppins.variable}>
      <body style={{ 
        margin: 0, 
        padding: 0, 
        fontFamily: 'var(--font-poppins), sans-serif',
        backgroundColor: 'var(--bg-pagina)', 
        color: 'var(--texto-principal)',
        transition: 'background-color 0.3s ease, color 0.3s ease'
      }}>
        {/* Só renderiza as notificações se estiver montado no cliente */}
        {isMounted && <NotificationSystem userProfile={userProfile} />}

        {children}
      </body>
    </html>
  );
}