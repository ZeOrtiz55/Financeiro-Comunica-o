'use client'
import { Poppins } from "next/font/google";
import "./globals.css";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase"; // Verifique se o caminho do seu supabase está correto

const poppins = Poppins({ 
  subsets: ["latin"], 
  weight: ["400", "500", "700", "900"],
  variable: '--font-poppins',
});

export default function RootLayout({ children }) {

  // ESTA LÓGICA BUSCA O TEMA NO BANCO E APLICA NO SITE TODO
  useEffect(() => {
    const aplicarTema = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from('financeiro_usu')
          .select('tema')
          .eq('id', session.user.id)
          .single();
        
        if (data?.tema) {
          // Isso injeta o atributo no HTML que o seu globals.css vai ler
          document.documentElement.setAttribute('data-theme', data.tema);
        }
      }
    };
    aplicarTema();

    // Opcional: Escutar mudanças em tempo real se o usuário mudar o tema em outra aba
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      aplicarTema();
    });

    return () => subscription?.unsubscribe();
  }, []);

  return (
    <html lang="pt-br" className={poppins.variable}>
      <body style={{ 
        margin: 0, 
        padding: 0, 
        fontFamily: 'var(--font-poppins), sans-serif',
        // AQUI ESTÁ O SEGREDO: Tiramos a cor fixa e usamos a variável do globals.css
        backgroundColor: 'var(--bg-pagina)', 
        color: 'var(--texto-principal)',
        transition: 'background-color 0.3s ease, color 0.3s ease'
      }}>
        {children}
      </body>
    </html>
  );
}