'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [funcao, setFuncao] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)

    if (isRegistering) {
      // 1. Cadastra no Authentication
      const { data, error } = await supabase.auth.signUp({ email, password })
      
      if (error) {
        alert('Erro no cadastro: ' + error.message)
      } else if (data.user) {
        // 2. Salva Nome e Função na tabela financeiro_usu
        const { error: dbError } = await supabase
          .from('financeiro_usu')
          .insert([{ 
            id: data.user.id, 
            nome: nome, 
            funcao: funcao 
          }])
        
        if (dbError) alert('Erro ao salvar perfil: ' + dbError.message)
        else {
          alert('Cadastro realizado! Agora você pode entrar.')
          setIsRegistering(false)
        }
      }
    } else {
      // Login normal
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (!error) router.push('/')
      else alert('Dados incorretos ou usuário não encontrado.')
    }
    setLoading(false)
  }

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.45)',
    backdropFilter: 'blur(15px)',
    WebkitBackdropFilter: 'blur(15px)',
    borderRadius: '45px',
    padding: '45px',
    width: '100%',
    maxWidth: '420px',
    border: '1px solid rgba(255, 255, 255, 0.4)',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.1)',
    textAlign: 'center'
  }

  const inputStyle = {
    width: '100%',
    padding: '15px 20px',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    background: 'rgba(255, 255, 255, 0.5)',
    outline: 'none',
    fontSize: '14px',
    boxSizing: 'border-box'
  }

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0 }}>
      
      <div style={glassStyle}>
        <div style={{ marginBottom: '35px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '900', color: 'black', fontStyle: 'italic', margin: 0, lineHeight: '0.8' }}>
            NOVA<br/>TRATORES
          </h1>
          <p style={{ color: '#166534', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '3px', marginTop: '15px' }}>
            Painel Financeiro
          </p>
        </div>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {isRegistering && (
            <>
              <input type="text" placeholder="Seu Nome Completo" required style={inputStyle} 
                onChange={(e) => setNome(e.target.value)} />
              
              <select required style={{ ...inputStyle, fontWeight: 'bold', color: '#666' }} 
                onChange={(e) => setFuncao(e.target.value)}>
                <option value="">Qual sua função?</option>
                <option value="Financeiro">Financeiro</option>
                <option value="Pós-Vendas">Pós-Vendas</option>
                <option value="Vendas">Vendas</option>
                <option value="Diretoria">Diretoria</option>
              </select>
            </>
          )}

          <input type="email" placeholder="E-mail Corporativo" required style={inputStyle} 
            onChange={(e) => setEmail(e.target.value)} />
          
          <input type="password" placeholder="Senha" required style={inputStyle} 
            onChange={(e) => setPassword(e.target.value)} />

          <button disabled={loading} style={{ 
            backgroundColor: '#22c55e', color: 'white', padding: '18px', borderRadius: '18px',
            border: 'none', fontWeight: '900', cursor: 'pointer', boxShadow: '0 10px 20px rgba(34, 197, 94, 0.2)',
            textTransform: 'uppercase', fontSize: '14px', marginTop: '10px'
          }}>
            {loading ? 'Aguarde...' : (isRegistering ? 'Criar Acesso' : 'Entrar')}
          </button>
        </form>

        <button onClick={() => setIsRegistering(!isRegistering)} style={{ 
          background: 'none', border: 'none', color: '#166534', fontSize: '11px', 
          fontWeight: 'bold', marginTop: '30px', cursor: 'pointer', textTransform: 'uppercase' 
        }}>
          {isRegistering ? 'Voltar para o Login' : 'Solicitar Novo Acesso'}
        </button>
      </div>
    </div>
  )
}