'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { 
  ShieldCheck, Mail, Lock, User, Briefcase, Camera, LogIn, UserPlus 
} from 'lucide-react'

// --- MESMO FUNDO DO PAINEL PARA PADRONIZAÇÃO ---
function GeometricBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', background: '#f0f4f8', pointerEvents: 'none' }}>
      <img src="https://images.unsplash.com/photo-1633167606207-d840b5070fc2?q=80&w=900" style={{ position: 'absolute', top: '-15%', left: '-10%', width: '900px', opacity: 0.15, transform: 'rotate(-15deg)' }} alt="" />
      <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800" style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '800px', opacity: 0.12, transform: 'rotate(10deg)' }} alt="" />
      <img src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070" style={{ position: 'absolute', top: '25%', left: '10%', width: '600px', opacity: 0.08, filter: 'blur(2px)' }} alt="" />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, rgba(240, 244, 248, 0.4) 100%)' }}></div>
    </div>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nome, setNome] = useState('')
  const [funcao, setFuncao] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)

    if (isRegistering) {
      // Validação de senha
      if (password !== confirmPassword) {
        alert('As senhas não coincidem!')
        setLoading(false)
        return
      }

      // 1. Cadastro no Auth
      const { data, error } = await supabase.auth.signUp({ email, password })
      
      if (error) {
        alert('Erro no cadastro: ' + error.message)
      } else if (data.user) {
        let avatarUrl = ''

        // 2. Upload da Foto (se houver)
        if (avatarFile) {
          const fileExt = avatarFile.name.split('.').pop()
          const fileName = `${data.user.id}-${Math.random()}.${fileExt}`
          const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, avatarFile)
          
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
            avatarUrl = urlData.publicUrl
          }
        }

        // 3. Salva perfil na tabela
        const { error: dbError } = await supabase
          .from('financeiro_usu')
          .insert([{ 
            id: data.user.id, 
            nome: nome, 
            funcao: funcao,
            avatar_url: avatarUrl // Novo campo para a foto
          }])
        
        if (dbError) alert('Erro ao salvar perfil: ' + dbError.message)
        else {
          alert('Conta criada com sucesso!')
          setIsRegistering(false)
        }
      }
    } else {
      // Login normal
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (!error) router.push('/')
      else alert('Acesso negado. Verifique seus dados.')
    }
    setLoading(false)
  }

  const inputContainer = { position: 'relative', width: '100%' }
  const iconStyle = { position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }
  const inputStyle = { 
    width: '100%', padding: '18px 20px 18px 55px', borderRadius: '18px', 
    border: '1px solid #cbd5e1', background: 'rgba(255,255,255,0.7)', 
    outline: 'none', fontSize: '15px', fontFamily: 'Montserrat', transition: '0.3s'
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;700;900&display=swap" rel="stylesheet" />
      <GeometricBackground />

      <div style={{ 
        background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(20px)',
        padding: '60px', borderRadius: '40px', width: '100%', maxWidth: '500px', 
        boxShadow: '0 40px 100px rgba(0,0,0,0.1)', border: '1px solid #fff', textAlign: 'center' 
      }}>
        
        <div style={{ marginBottom: '40px' }}>
          <div style={{ background: '#000', color: '#fff', width: '70px', height: '70px', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px' }}>
            <ShieldCheck size={35} />
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '2px' }}>NOVA TRATORES</h1>
          <p style={{ color: '#64748b', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '4px', marginTop: '10px' }}>
            Acesso Corporativo
          </p>
        </div>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {isRegistering && (
            <>
              {/* UPLOAD DE FOTO */}
              <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f1f5f9', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {avatarFile ? <img src={URL.createObjectURL(avatarFile)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera color="#94a3b8" />}
                </div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#3b82f6' }}>ADICIONAR FOTO</span>
                <input type="file" hidden accept="image/*" onChange={(e) => setAvatarFile(e.target.files[0])} />
              </label>

              <div style={inputContainer}>
                <User size={18} style={iconStyle} />
                <input type="text" placeholder="Nome Completo" required style={inputStyle} onChange={(e) => setNome(e.target.value)} />
              </div>
              
              <div style={inputContainer}>
                <Briefcase size={18} style={iconStyle} />
                <select required style={{ ...inputStyle, appearance: 'none' }} onChange={(e) => setFuncao(e.target.value)}>
                  <option value="">Selecione sua função</option>
                  <option value="Financeiro">Financeiro</option>
                  <option value="Pós-Vendas">Pós-Vendas</option>
                  <option value="Vendas">Vendas</option>
                  <option value="Diretoria">Diretoria</option>
                </select>
              </div>
            </>
          )}

          <div style={inputContainer}>
            <Mail size={18} style={iconStyle} />
            <input type="email" placeholder="E-mail Corporativo" required style={inputStyle} onChange={(e) => setEmail(e.target.value)} />
          </div>
          
          <div style={inputContainer}>
            <Lock size={18} style={iconStyle} />
            <input type="password" placeholder="Senha" required style={inputStyle} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {isRegistering && (
            <div style={inputContainer}>
              <Lock size={18} style={iconStyle} />
              <input type="password" placeholder="Confirmar Senha" required style={inputStyle} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
          )}

          <button disabled={loading} style={{ 
            backgroundColor: '#000', color: 'white', padding: '20px', borderRadius: '18px',
            border: 'none', fontWeight: '900', cursor: 'pointer', fontSize: '15px', 
            marginTop: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', transition: '0.3s'
          }} className="btn-hover">
            {loading ? 'PROCESSANDO...' : (isRegistering ? 'CRIAR MINHA CONTA' : 'ENTRAR NO PORTAL')}
          </button>
        </form>

        <button onClick={() => setIsRegistering(!isRegistering)} style={{ 
          background: 'none', border: 'none', color: '#64748b', fontSize: '13px', 
          fontWeight: '600', marginTop: '30px', cursor: 'pointer' 
        }}>
          {isRegistering ? 'Já tenho acesso? Fazer Login' : 'Não tem conta? Solicite aqui'}
        </button>

      </div>

      <style jsx>{`
        .btn-hover:hover { transform: translateY(-2px); background: #1e293b; }
      `}</style>
    </div>
  )
}