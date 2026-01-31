'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
// IMPORTAÇÃO DE ÍCONES COMPLETA
import { 
  Bell, MessageSquare, X, Menu, PlusCircle, FileText, Download, 
  CheckCircle, LogOut, User, ShieldCheck, Upload, Send, 
  Calendar, CreditCard, Hash, History, ArrowLeft, Paperclip, ImageIcon, 
  CheckCheck, Eye, LayoutDashboard, ClipboardList, UserCheck, TrendingUp, TrendingDown, Search
} from 'lucide-react'

// --- COMPONENTE DE FUNDO COM OBJETOS ABSTRATOS (MANTIDO) ---
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

function LoadingScreen() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;900&display=swap" rel="stylesheet" />
        <h1 style={{ color: '#fff', fontFamily: 'Montserrat, sans-serif', fontWeight: '300', fontSize: '28px', letterSpacing: '4px', textTransform: 'uppercase', textAlign: 'center' }}>
            Controle de Boletos <br /> <b style={{ fontWeight: '900', fontSize: '32px' }}>Nova Tratores</b>
        </h1>
    </div>
  )
}

const formatarData = (dataStr) => {
  if (!dataStr || dataStr === 'null') return '';
  const partes = dataStr.split('-');
  return partes.length !== 3 ? dataStr : `${partes[2]}/${partes[1]}/${partes[0]}`;
};

// --- 1. CHAT INTERNO (DENTRO DOS CARDS) ---
function ChatChamado({ chamadoId, userProfile }) {
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()

  useEffect(() => {
    if (!chamadoId || !userProfile?.id) return
    supabase.from('mensagens_chat').select('*').eq('chamado_id', chamadoId).order('created_at', { ascending: true })
      .then(({ data }) => setMensagens(data || []))

    const channel = supabase.channel(`chat_kbn_${chamadoId}`).on('postgres_changes', { 
      event: 'INSERT', schema: 'public', table: 'mensagens_chat', filter: `chamado_id=eq.${chamadoId}` 
    }, payload => { 
      if (String(payload.new.usuario_id) !== String(userProfile.id)) setMensagens(prev => [...(prev || []), payload.new]) 
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [chamadoId, userProfile?.id])

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [mensagens])

  const enviar = async (e) => {
    e.preventDefault(); if (!novaMsg.trim()) return
    const texto = novaMsg; setNovaMsg('')
    const { error } = await supabase.from('mensagens_chat').insert([{ texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id, chamado_id: chamadoId }])
    if (error) alert("Erro: " + error.message)
    else setMensagens(prev => [...(prev || []), { id: Date.now(), texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id }])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid #cbd5e1', borderRadius: '20px', overflow: 'hidden', background: '#fff' }}>
      <div style={{ padding: '15px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: '900', fontSize: '10px', color: '#64748b' }}>CONVERSA DO PROCESSO</div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {mensagens.map((m) => (
          <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile?.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile?.id) ? '#1e293b' : '#f1f5f9', color: String(m.usuario_id) === String(userProfile?.id) ? '#fff' : '#000', padding: '12px 18px', borderRadius: '15px', maxWidth: '85%' }}>
            <b style={{ fontSize: '8px', opacity: 0.5, display: 'block', marginBottom: '4px' }}>{m.usuario_nome?.toUpperCase()}</b>
            <span style={{ fontSize: '14px' }}>{m.texto}</span>
          </div>
        ))}
      </div>
      <form onSubmit={enviar} style={{ padding: '15px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px' }}>
        <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Escreva..." style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
        <button style={{ background: '#1e293b', color: '#fff', border: 'none', borderRadius: '10px', width: '45px' }}><Send size={18} /></button>
      </form>
    </div>
  )
}

// --- 2. KANBAN PAGE PRINCIPAL ---
export default function KanbanPage() {
  const [chamados, setChamados] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [pesquisa, setPesquisa] = useState('') // ESTADO PARA O FILTRO
  const [fileBoleto, setFileBoleto] = useState(null)
  const router = useRouter()

  const colunas = [
    { id: 'gerar_boleto', titulo: 'GERAR BOLETO' },
    { id: 'enviar_cliente', titulo: 'ENVIAR CLIENTE' },
    { id: 'aguardando_vencimento', titulo: 'EM ABERTO' },
    { id: 'vencido', titulo: 'VENCIDO' },
    { id: 'pago', titulo: 'PAGO' }
  ]

  useEffect(() => {
    const carregar = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/login')
      const { data: prof } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single()
      setUserProfile(prof)
      const { data } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido').order('id', {ascending: false})
      setChamados(data || [])
      setLoading(false)
    }
    carregar()
  }, [router])

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  // --- LÓGICA DO FILTRO ---
  const chamadosFiltrados = chamados.filter(c => 
    c.nom_cliente?.toLowerCase().includes(pesquisa.toLowerCase()) ||
    c.id.toString().includes(pesquisa) ||
    c.num_nf_peca?.toString().includes(pesquisa) ||
    c.num_nf_servico?.toString().includes(pesquisa)
  )

  const btnSidebarStyle = {
    background: 'none', color: '#000', border: 'none', padding: '20px 0', cursor: 'pointer',
    fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', width: '100%', transition: '0.3s'
  }

  if (loading) return <LoadingScreen />

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Montserrat, sans-serif', background: 'transparent' }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;900&display=swap" rel="stylesheet" />
      <GeometricBackground />

      {/* ASIDE COM ÍCONES PRETOS VISÍVEIS QUANDO FECHADO */}
      <aside onMouseEnter={()=>setIsSidebarOpen(true)} onMouseLeave={()=>setIsSidebarOpen(false)} style={{ width: isSidebarOpen ? '320px' : '85px', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', height: '100vh', position: 'fixed', left: 0, top: 0, borderRight: '1px solid #cbd5e1', padding: '30px 0', display: 'flex', flexDirection: 'column', transition: '0.4s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 1100, overflow: 'hidden' }}>
        <div style={{ flex: 1 }}>
            <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '40px' }}>
                {isSidebarOpen ? <b style={{color:'#000', fontSize:'22px', fontWeight: '900', letterSpacing:'3px'}}>NOVA</b> : <Menu size={32} color="#000" />}
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column' }}>
                <button onClick={() => router.push('/')} style={btnSidebarStyle}>
                    <div style={{minWidth: '85px', display:'flex', justifyContent:'center'}}><LayoutDashboard size={28} color="#000" /></div>
                    <span style={{ opacity: isSidebarOpen ? 1 : 0, transition: '0.3s', whiteSpace: 'nowrap' }}>TAREFAS</span>
                </button>
                <button onClick={() => router.push('/kanban')} style={{...btnSidebarStyle, background: 'rgba(0,0,0,0.05)'}}>
                    <div style={{minWidth: '85px', display:'flex', justifyContent:'center'}}><ClipboardList size={28} color="#000" /></div>
                    <span style={{ opacity: isSidebarOpen ? 1 : 0, transition: '0.3s', whiteSpace: 'nowrap' }}>BOLETOS</span>
                </button>
                <div style={{ height: '1px', background: '#e2e8f0', margin: '20px 0', opacity: isSidebarOpen ? 1 : 0 }}></div>
                <button onClick={() => router.push('/historico-pagar')} style={btnSidebarStyle}>
                    <div style={{minWidth: '85px', display:'flex', justifyContent:'center'}}><TrendingDown size={28} color="#000" /></div>
                    <span style={{ opacity: isSidebarOpen ? 1 : 0, transition: '0.3s', whiteSpace: 'nowrap' }}>Concluido- Contas a Pagar</span>
                </button>
                <button onClick={() => router.push('/historico-receber')} style={btnSidebarStyle}>
                    <div style={{minWidth: '85px', display:'flex', justifyContent:'center'}}><TrendingUp size={28} color="#000" /></div>
                    <span style={{ opacity: isSidebarOpen ? 1 : 0, transition: '0.3s', whiteSpace: 'nowrap' }}>Concluido- Contas a Receber</span>
                </button>
                <button onClick={() => router.push('/historico-rh')} style={btnSidebarStyle}>
                    <div style={{minWidth: '85px', display:'flex', justifyContent:'center'}}><UserCheck size={28} color="#000" /></div>
                    <span style={{ opacity: isSidebarOpen ? 1 : 0, transition: '0.3s', whiteSpace: 'nowrap' }}>Concluido-Chamado RH</span>
                </button>
            </nav>
        </div>
        <div style={{ paddingBottom: '20px' }}>
            <button onClick={handleLogout} style={{ ...btnSidebarStyle, color: '#dc2626' }}>
                <div style={{minWidth: '85px', display:'flex', justifyContent:'center'}}><LogOut size={28} color="#dc2626" /></div>
                <span style={{ opacity: isSidebarOpen ? 1 : 0 }}>SAIR</span>
            </button>
        </div>
      </aside>

      <main style={{ marginLeft: isSidebarOpen ? '320px' : '85px', flex: 1, padding: '50px', zIndex: 1, position: 'relative', transition: '0.4s' }}>
        <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'50px' }}>
            <div>
                <h1 style={{ fontWeight: '300', color: '#0f172a', margin: 0, fontSize:'42px', letterSpacing:'-2px' }}>Controle de Boletos</h1>
                <div style={{ width: '80px', height: '4px', background: '#000', marginTop: '15px' }}></div>
            </div>
            
            {/* FILTRO DE PESQUISA */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={22} style={{ position: 'absolute', left: '15px', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  placeholder="Pesquisar Cliente ou NF..." 
                  value={pesquisa}
                  onChange={(e) => setPesquisa(e.target.value)}
                  style={{ padding: '18px 20px 18px 50px', width: '400px', borderRadius: '15px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px', fontFamily: 'Montserrat', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}
                />
            </div>
        </header>

        <div style={{ display: 'flex', gap: '25px', overflowX: 'auto', alignItems: 'flex-start', paddingBottom:'30px' }}>
          {colunas.map(col => (
            <div key={col.id} style={{ minWidth: '380px', flex: 1 }}>
              <h3 style={{ background: '#000', color: '#fff', padding: '20px', borderRadius: '10px', marginBottom: '25px', fontWeight: '400', fontSize: '18px', textAlign: 'center', letterSpacing: '2px' }}>{col.titulo}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {chamadosFiltrados.filter(c => c.status === col.id).map(t => (
                  <div key={t.id} onClick={() => setTarefaSelecionada(t)} style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderRadius: '15px', border: '1px solid #cbd5e1', cursor: 'pointer', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                    <div style={{ background: '#1e293b', padding: '22px', color: '#fff' }}>
                        <h4 style={{ margin: 0, fontSize: '24px', fontWeight: '400' }}>{t.nom_cliente?.toUpperCase()}</h4>
                        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div><span style={{ fontSize: '10px', opacity: 0.7, fontWeight: 'bold', display: 'block' }}>VALOR</span><b style={{ fontSize: '24px', color: '#38bdf8' }}>R$ {t.valor_servico}</b></div>
                            <div style={{ textAlign: 'right' }}><CreditCard size={16} style={{ opacity: 0.7 }} /><b style={{ fontSize: '12px', display: 'block' }}>{t.forma_pagamento?.toUpperCase()}</b></div>
                        </div>
                    </div>
                    <div style={{ padding: '20px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', color:'#64748b' }}>
                            <span>ID: <b>#{t.id}</b></span>
                            <span>NF: <b>{t.num_nf_peca || t.num_nf_servico || '-'}</b></span>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* MODAL GIGANTE 1600PX */}
      {tarefaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(10px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', width: '1600px', maxWidth: '98%', maxHeight: '95vh', borderRadius: '25px', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden', boxShadow: '0 50px 100px rgba(0,0,0,0.5)' }}>
            <div style={{ flex: '1 1 900px', padding: '60px', overflowY: 'auto' }}>
              <button onClick={() => setTarefaSelecionada(null)} style={{ background: '#000', border: 'none', color: '#fff', padding: '12px 25px', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', marginBottom: '30px' }}>VOLTAR</button>
              <h2 style={{ fontSize: '48px', fontWeight: '100', color: '#0f172a' }}>{tarefaSelecionada.nom_cliente?.toUpperCase()}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', border: '1px solid #eee', borderRadius:'20px', overflow:'hidden', marginTop: '40px' }}>
                 <div style={{ padding: '30px', borderRight: '1px solid #eee' }}><label style={{fontSize:'12px', color: '#94a3b8', fontWeight:'900'}}>VALOR TOTAL</label><br/><b style={{fontSize:'42px', color:'#0f172a'}}>R$ {tarefaSelecionada.valor_servico}</b></div>
                 <div style={{ padding: '30px' }}><label style={{fontSize:'12px', color: '#94a3b8', fontWeight:'900'}}>NF</label><br/><b style={{fontSize: '24px'}}>{tarefaSelecionada.num_nf_peca || tarefaSelecionada.num_nf_servico}</b></div>
              </div>
            </div>
            <div style={{ flex: '1 1 500px', padding: '40px', background: '#f8fafc', borderLeft: '1px solid #eee' }}>
              {userProfile && <ChatChamado chamadoId={tarefaSelecionada.id} userProfile={userProfile} />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}