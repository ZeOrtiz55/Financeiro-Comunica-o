'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, User, Volume2, Palette, Camera, Save, Lock, Mail, Settings, Play, CheckCircle2
} from 'lucide-react'

// --- COMPONENTE DE FUNDO COM OBJETOS ABSTRATOS ---
function GeometricBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', background: '#f0f4f8', pointerEvents: 'none' }}>
      <img src="https://images.unsplash.com/photo-1633167606207-d840b5070fc2?q=80&w=900" style={{ position: 'absolute', top: '-15%', left: '-10%', width: '900px', opacity: 0.15, transform: 'rotate(-15deg)' }} alt="" />
      <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800" style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '800px', opacity: 0.12, transform: 'rotate(10deg)' }} alt="" />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, rgba(240, 244, 248, 0.4) 100%)' }}></div>
    </div>
  )
}

export default function Configuracoes() {
  const [tab, setTab] = useState('perfil') // Controle de abas
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const router = useRouter()

  // Estados dos inputs
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarUrl, setAvatarUrl] = useState('')

  // Estado para o Som
  const [somSelecionado, setSomSelecionado] = useState('som-notificacao-1.mp3')

  const sonsDisponiveis = [
    { id: 'som-notificacao-1.mp3', nome: 'Alerta Clássico 1', desc: 'Som curto e elegante' },
    { id: 'som-notificacao-2.mp3', nome: 'Alerta Moderno 2', desc: 'Som melódico e suave' },
    { id: 'som-notificacao-3.mp3', nome: 'Alerta Ativo 3', desc: 'Som de maior destaque' },
  ]

  useEffect(() => {
    const carregarDados = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/login')

      const { data: prof } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single()
      
      setUserProfile(prof)
      setNome(prof?.nome || '')
      setEmail(session.user.email || '')
      setAvatarUrl(prof?.avatar_url || '')
      setSomSelecionado(prof?.som_notificacao || 'som-notificacao-1.mp3')
      setLoading(false)
    }
    carregarDados()
  }, [router])

  // FUNÇÃO CORRIGIDA PARA TOCAR PRÉVIA E EVITAR O ERRO
  const tocarPrevia = (nomeSom) => {
    try {
      // Certifique-se que o arquivo está na pasta /public/som-notificacao-1.mp3
      const audio = new Audio(`/${nomeSom}`);
      
      audio.play().catch(e => {
        console.error("Erro ao reproduzir áudio. Verifique se o arquivo existe na pasta public:", e);
        alert(`Não foi possível carregar o arquivo: ${nomeSom}. Verifique se ele está na pasta public.`);
      });
      
      setSomSelecionado(nomeSom);
    } catch (error) {
      console.error("Falha ao instanciar áudio:", error);
    }
  }

  const handleUpdatePerfil = async (e) => {
    if (e) e.preventDefault()
    setUpdating(true)
    try {
      let currentAvatarUrl = avatarUrl

      // 1. Se escolheu nova foto, faz upload
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `${userProfile.id}-${Date.now()}.${fileExt}`
        const { error: upErr } = await supabase.storage.from('avatars').upload(fileName, avatarFile)
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
        currentAvatarUrl = urlData.publicUrl
      }

      // 2. Atualiza Tabela de Usuários (Salvando Nome, Foto e SOM)
      const { error: dbErr } = await supabase
        .from('financeiro_usu')
        .update({ 
          nome, 
          avatar_url: currentAvatarUrl,
          som_notificacao: somSelecionado 
        })
        .eq('id', userProfile.id)
      
      if (dbErr) throw dbErr

      // 3. Atualiza E-mail e Senha no Auth (se preenchidos)
      if (senha) {
        const { error: authErr } = await supabase.auth.updateUser({ password: senha })
        if (authErr) throw authErr
      }

      alert("Configurações salvas com sucesso!")
      window.location.reload()
    } catch (err) {
      alert("Erro ao atualizar: " + err.message)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <div style={{background:'#f0f4f8', height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Montserrat'}}>CARREGANDO...</div>

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Montserrat, sans-serif', padding: '50px' }}>
      <GeometricBackground />
      
      <header style={{ maxWidth: '1200px', margin: '0 auto 40px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button onClick={() => router.push('/')} style={{ background: '#000', color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '900', fontSize: '12px' }}>
          <ArrowLeft size={16} /> VOLTAR
        </button>
        <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', margin: 0 }}>Configurações</h1>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '30px' }}>
        
        {/* MENU LATERAL DE CONFIG */}
        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={() => setTab('perfil')} style={{ ...tabBtnStyle, background: tab === 'perfil' ? '#000' : 'rgba(255,255,255,0.6)', color: tab === 'perfil' ? '#fff' : '#64748b' }}>
            <User size={20} /> Perfil do Usuário
          </button>
          <button onClick={() => setTab('som')} style={{ ...tabBtnStyle, background: tab === 'som' ? '#000' : 'rgba(255,255,255,0.6)', color: tab === 'som' ? '#fff' : '#64748b' }}>
            <Volume2 size={20} /> Sons e Alertas
          </button>
          <button onClick={() => setTab('tema')} style={{ ...tabBtnStyle, background: tab === 'tema' ? '#000' : 'rgba(255,255,255,0.6)', color: tab === 'tema' ? '#fff' : '#64748b' }}>
            <Palette size={20} /> Personalização e Tema
          </button>
        </div>

        {/* ÁREA DE CONTEÚDO (GLASS) */}
        <div style={{ flex: 1, background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(15px)', borderRadius: '35px', padding: '50px', border: '1px solid #fff', boxShadow: '0 30px 60px rgba(0,0,0,0.05)' }}>
          
          {tab === 'perfil' && (
            <form onSubmit={handleUpdatePerfil}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginBottom: '40px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '120px', height: '120px', borderRadius: '40px', background: '#f1f5f9', overflow: 'hidden', border: '4px solid #fff', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
                    {avatarFile ? (
                      <img src={URL.createObjectURL(avatarFile)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <img src={avatarUrl || 'https://via.placeholder.com/150'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                  <label style={{ position: 'absolute', bottom: '-10px', right: '-10px', background: '#000', color: '#fff', padding: '10px', borderRadius: '15px', cursor: 'pointer', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }}>
                    <Camera size={18} />
                    <input type="file" hidden accept="image/*" onChange={e => setAvatarFile(e.target.files[0])} />
                  </label>
                </div>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: 0 }}>{nome}</h2>
                  <p style={{ color: '#64748b', fontSize: '14px' }}>{userProfile?.funcao}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                <div style={inputGroup}>
                  <label style={labelStyle}>NOME COMPLETO</label>
                  <input style={inputStyle} value={nome} onChange={e => setNome(e.target.value)} />
                </div>
                <div style={inputGroup}>
                  <label style={labelStyle}>E-MAIL (APENAS LEITURA)</label>
                  <input style={{...inputStyle, opacity: 0.6}} value={email} disabled />
                </div>
                <div style={inputGroup}>
                  <label style={labelStyle}>NOVA SENHA (DEIXE VAZIO PARA MANTER)</label>
                  <input type="password" style={inputStyle} placeholder="••••••••" value={senha} onChange={e => setSenha(e.target.value)} />
                </div>
              </div>

              <button disabled={updating} type="submit" style={{ marginTop: '40px', background: '#000', color: '#fff', border: 'none', padding: '20px 40px', borderRadius: '18px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px', fontSize: '15px' }}>
                {updating ? 'SALVANDO...' : <><Save size={20} /> SALVAR ALTERAÇÕES</>}
              </button>
            </form>
          )}

          {tab === 'som' && (
            <div>
               <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', marginBottom: '10px' }}>Sons de Notificação</h2>
               <p style={{ color: '#64748b', marginBottom: '30px' }}>Escolha o alerta sonoro que você prefere receber. Clique em um som para ouvir uma prévia.</p>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {sonsDisponiveis.map((som) => (
                    <div 
                      key={som.id}
                      onClick={() => tocarPrevia(som.id)}
                      style={{
                        padding: '25px',
                        borderRadius: '20px',
                        background: somSelecionado === som.id ? 'rgba(0,0,0,0.02)' : 'transparent',
                        border: somSelecionado === som.id ? '2px solid #000' : '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: '0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: somSelecionado === som.id ? '#000' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: somSelecionado === som.id ? '#fff' : '#000' }}>
                          <Play size={20} fill={somSelecionado === som.id ? "white" : "none"} />
                        </div>
                        <div>
                          <b style={{ fontSize: '16px', color: '#0f172a', display: 'block' }}>{som.nome}</b>
                          <span style={{ fontSize: '13px', color: '#94a3b8' }}>{som.desc}</span>
                        </div>
                      </div>
                      {somSelecionado === som.id && <CheckCircle2 size={24} color="#000" />}
                    </div>
                  ))}
               </div>

               <button onClick={handleUpdatePerfil} disabled={updating} style={{ marginTop: '40px', background: '#000', color: '#fff', border: 'none', padding: '20px 40px', borderRadius: '18px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px', fontSize: '15px' }}>
                {updating ? 'SALVANDO...' : <><Save size={20} /> SALVAR PREFERÊNCIA DE SOM</>}
              </button>
            </div>
          )}

          {tab === 'tema' && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', marginBottom: '10px' }}>Personalização</h2>
              <p style={{ color: '#64748b' }}>A escolha de temas e cores personalizadas estará disponível na próxima atualização.</p>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

// ESTILOS AUXILIARES
const tabBtnStyle = {
  width: '100%', padding: '20px 25px', border: 'none', borderRadius: '18px', textAlign: 'left',
  fontWeight: '700', cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '15px', transition: '0.3s'
}
const inputGroup = { display: 'flex', flexDirection: 'column', gap: '10px' }
const labelStyle = { fontSize: '10px', fontWeight: '900', color: '#94a3b8', letterSpacing: '1px' }
const inputStyle = { width: '100%', padding: '18px', borderRadius: '15px', border: '1px solid #cbd5e1', outline: 'none', fontFamily: 'Montserrat', fontSize: '15px', background: '#fff' }