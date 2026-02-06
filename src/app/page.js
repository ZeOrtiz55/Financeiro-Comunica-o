'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function RootPage() {
  const router = useRouter()

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

      // REDIRECIONAMENTO PARA AS ROTAS (SEM .JS NO FINAL)
      if (prof?.funcao === 'Financeiro') {
        router.push('/home-financeiro')
      } else {
        router.push('/home-posvendas')
      }
    }

    checkUser()
  }, [router])

  return (
    <div style={{ background: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Montserrat' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '300', letterSpacing: '4px', marginBottom: '10px' }}>NOVA TRATORES</h1>
        <p style={{ fontSize: '12px', opacity: 0.7 }}>DIRECIONANDO AO SEU PAINEL...</p>
      </div>
    </div>
  )
}