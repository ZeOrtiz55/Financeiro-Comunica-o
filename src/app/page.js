'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function RootPage() {
  const router = useRouter()

  // --- FUNÇÃO DE LOGOUT MANTIDA CONFORME SOLICITADO ---
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      console.log("Iniciando verificação de rota...");
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      
      if (authError || !session) {
        console.log("Sem sessão, mandando para o login");
        router.push('/login')
        return
      }

      // Busca a função do usuário para saber qual home abrir
      const { data: prof, error: profError } = await supabase
        .from('financeiro_usu')
        .select('funcao')
        .eq('id', session.user.id)
        .single()

      if (profError) {
        console.error("Erro ao buscar perfil:", profError);
        // Se der erro no perfil, tenta mandar para a home de pós-vendas por segurança
        router.push('/home-posvendas');
        return;
      }

      console.log("Usuário identificado como:", prof?.funcao);

      // REDIRECIONAMENTO PARA AS ROTAS
      if (prof?.funcao === 'Financeiro') {
        router.push('/home-financeiro')
      } else {
        router.push('/home-posvendas')
      }
    }

    checkUser()
  }, [router])

  return (
    <div style={{ 
      background: '#18181b', 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      color: '#e2e8f0', 
      fontFamily: 'Montserrat, sans-serif' 
    }}>
      <div style={{ textAlign: 'center' }}>
        {/* TÍTULO COM ESPAÇAMENTO MODERNO E SEM NEGRITO */}
        <h1 style={{ 
          fontSize: '20px', 
          fontWeight: '300', 
          letterSpacing: '6px', 
          marginBottom: '15px',
          color: '#f8fafc',
          textTransform: 'uppercase'
        }}>
          Nova Tratores
        </h1>
        
        {/* SUBTÍTULO SUAVE COM OPACIDADE AJUSTADA */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <div className="spinner"></div>
          <p style={{ 
            fontSize: '13px', 
            fontWeight: '400', 
            opacity: 0.6, 
            letterSpacing: '1px' 
          }}>
            Sincronizando fluxo...
          </p>
        </div>
      </div>

      <style jsx>{`
        .spinner {
          width: 14px;
          height: 14px;
          border: 1px solid rgba(226, 232, 240, 0.2);
          border-top: 1px solid #e2e8f0;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}