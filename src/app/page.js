'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
// IMPORTAÇÃO DE ÍCONES COMPLETA
import { 
  Bell, MessageSquare, X, Menu, PlusCircle, FileText, Download, 
  CheckCircle, LogOut, User, ShieldCheck, Upload, Send, 
  Calendar, CreditCard, Hash, History, ArrowLeft, Paperclip, ImageIcon, 
  CheckCheck, Eye, LayoutDashboard, ClipboardList, UserCheck, TrendingUp, TrendingDown, Settings
} from 'lucide-react'

// --- COMPONENTE DE FUNDO COM OBJETOS ABSTRATOS ---
function GeometricBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', background: '#f0f4f8', pointerEvents: 'none' }}>
      <img 
        src="https://images.unsplash.com/photo-1633167606207-d840b5070fc2?q=80&w=2070&auto=format&fit=crop" 
        style={{ position: 'absolute', top: '-15%', left: '-10%', width: '900px', opacity: 0.15, transform: 'rotate(-15deg)' }}
        alt=""
      />
      <img 
        src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop" 
        style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '800px', opacity: 0.12, transform: 'rotate(10deg)' }}
        alt=""
      />
      <img 
        src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop" 
        style={{ position: 'absolute', top: '25%', left: '10%', width: '600px', opacity: 0.08, filter: 'blur(2px)' }}
        alt=""
      />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, rgba(240, 244, 248, 0.4) 100%)' }}></div>
    </div>
  )
}

// --- TELA DE CARREGAMENTO (SEM NEGRITO) ---
function LoadingScreen() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300&display=swap" rel="stylesheet" />
        <h1 style={{ color: '#fff', fontFamily: 'Montserrat, sans-serif', fontWeight: '300', fontSize: '28px', letterSpacing: '4px', textTransform: 'uppercase', textAlign: 'center', lineHeight: '1.4' }}>
            Comunicação Financeiro <br /> 
            <span style={{ fontSize: '32px' }}>Nova Tratores</span>
        </h1>
    </div>
  )
}

const formatarData = (dataStr) => {
  if (!dataStr || dataStr === 'null' || typeof dataStr !== 'string') return '';
  const partes = dataStr.split('-');
  if (partes.length !== 3) return dataStr; 
  const anoCurto = partes[0].slice(-2); 
  return `${partes[2]}/${partes[1]}/${anoCurto}`;
};

// --- 1. CHAT INTERNO ---
function ChatChamado({ chamadoId, userProfile }) {
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()

  useEffect(() => {
    if (!chamadoId || !userProfile?.id) return
    supabase.from('mensagens_chat').select('*').eq('chamado_id', chamadoId).order('created_at', { ascending: true })
      .then(({ data }) => setMensagens(data || []))

    const channel = supabase.channel(`chat_card_${chamadoId}`).on('postgres_changes', { 
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
      <div style={{ padding: '15px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '10px', color: '#64748b', letterSpacing: '1px' }}>CONVERSA DO PROCESSO</div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {(mensagens || []).map((m) => (
          <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile?.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile?.id) ? '#1e293b' : '#f1f5f9', color: String(m.usuario_id) === String(userProfile?.id) ? '#fff' : '#000', padding: '12px 18px', borderRadius: '15px', maxWidth: '85%' }}>
            <span style={{ fontSize: '8px', opacity: 0.5, display: 'block', marginBottom: '4px' }}>{m.usuario_nome?.toUpperCase()}</span>
            <span style={{ fontSize: '14px' }}>{m.texto}</span>
          </div>
        ))}
      </div>
      <form onSubmit={enviar} style={{ padding: '15px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px' }}>
        <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Mensagem..." style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
        <button style={{ background: '#1e293b', color: '#fff', border: 'none', borderRadius: '10px', width: '45px', cursor: 'pointer' }}><Send size={18} /></button>
      </form>
    </div>
  )
}

// --- 2. CHAT FLUTUANTE GERAL ---
function ChatFlutuante({ userProfile }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mensagens, setMensagens] = useState([]);
  const [novaMsg, setNovaMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef();

  const marcarComoVisto = async (msgs) => {
    if (!isOpen || !userProfile?.id) return;
    const naoVistas = msgs.filter(m => m.usuario_id !== userProfile.id && !(m.visualizado_por || []).some(v => v.id === userProfile.id));
    for (const msg of naoVistas) {
      const novaVisualizacao = { id: userProfile.id, nome: userProfile.nome };
      const novaLista = [...(msg.visualizado_por || []), novaVisualizacao];
      await supabase.from('mensagens_chat').update({ visualizado_por: novaLista }).eq('id', msg.id);
    }
  };

  useEffect(() => {
    if (!userProfile?.id) return;
    const load = async () => {
        const { data } = await supabase.from('mensagens_chat').select('*').is('chamado_id', null).order('created_at', { ascending: true }).limit(100);
        setMensagens(data || []);
        marcarComoVisto(data || []);
    }
    load();
    const channel = supabase.channel('chat_geral_home').on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens_chat' }, 
      p => { load() }
    ).subscribe();
    return () => { supabase.removeChannel(channel) };
  }, [userProfile?.id, isOpen]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [mensagens, isOpen]);

  const enviar = async (e) => {
    e.preventDefault(); if (!novaMsg.trim()) return;
    const t = novaMsg; setNovaMsg('');
    await supabase.from('mensagens_chat').insert([{ 
      texto: t, usuario_nome: userProfile.nome, usuario_id: userProfile.id, chamado_id: null, 
      data_hora: new Date().toISOString(), visualizado_por: [{ id: userProfile.id, nome: userProfile.nome }] 
    }]);
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('chat-midia').upload(fileName, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('chat-midia').getPublicUrl(fileName);
      await supabase.from('mensagens_chat').insert([{
        texto: file.type.startsWith('image') ? '📷 Foto' : '📎 Arquivo',
        midia_url: publicUrl, usuario_id: userProfile.id, usuario_nome: userProfile.nome, 
        chamado_id: null, data_hora: new Date().toISOString(), visualizado_por: [{ id: userProfile.id, nome: userProfile.nome }]
      }]);
    } catch (err) { alert("Erro upload: " + err.message); }
    finally { setUploading(false); }
  }

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 3000, fontFamily: 'Montserrat' }}>
      <button onClick={() => setIsOpen(!isOpen)} style={{ width: '75px', height: '75px', borderRadius: '25px', background: '#0f172a', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        {isOpen ? <X size={34} /> : <MessageSquare size={34} />}
      </button>

      {isOpen && (
        <div style={{ position: 'absolute', bottom: '95px', right: 0, width: '500px', height: '750px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', borderRadius: '35px', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 70px rgba(0,0,0,0.3)', border:'1px solid #e2e8f0', overflow:'hidden' }}>
           <div style={{ padding: '25px', background: '#0f172a', color: '#fff', fontSize:'18px' }}>CENTRAL DE COMUNICAÇÃO NOVA</div>
           
           <div ref={scrollRef} style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {(mensagens || []).map(m => {
                const souEu = String(m.usuario_id) === String(userProfile.id);
                const hora = m.data_hora ? new Date(m.data_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                const quemViu = (m.visualizado_por || []).filter(v => v.id !== m.usuario_id).map(v => v.nome).join(', ');

                return (
                  <div key={m.id} style={{ alignSelf: souEu ? 'flex-end' : 'flex-start', maxWidth:'80%' }}>
                    <div style={{ background: souEu ? '#0f172a' : '#fff', color: souEu ? '#fff' : '#000', padding: '15px', borderRadius: '20px', border:'1px solid #e2e8f0', boxShadow: '0 5px 10px rgba(0,0,0,0.03)' }}>
                      <span style={{fontSize:'10px', display:'block', opacity:0.6, marginBottom:'6px'}}>{m.usuario_nome?.toUpperCase()}</span>
                      <div style={{fontSize:'16px', lineHeight:'1.5'}}>{m.texto}</div>
                      <div style={{textAlign:'right', fontSize:'11px', opacity:0.6, marginTop:'10px', display:'flex', alignItems:'center', justifyContent:'flex-end', gap:'8px'}}>
                        <span>{hora}</span>
                        {souEu && (
                          <div className="tooltip-container" style={{display:'flex', alignItems:'center', gap:'2px', color: quemViu ? '#38bdf8' : '#94a3b8'}}>
                             <Eye size={18} style={{cursor:'pointer'}} />
                             {quemViu && <div className="tooltip-box">Visto por: {quemViu}</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
           </div>

           <form onSubmit={enviar} style={{ padding: '25px', display: 'flex', gap: '15px', borderTop:'1px solid #e2e8f0', alignItems:'center' }}>
              <label style={{cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', width:'55px', height:'55px', borderRadius:'15px', background:'#f1f5f9', color:'#64748b'}}>
                <Paperclip size={26} />
                <input type="file" hidden onChange={handleUpload} disabled={uploading} />
              </label>
              <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder={uploading ? "Subindo arquivo..." : "Escreva sua mensagem..."} style={{flex:1, padding:'18px', borderRadius:'15px', border:'1px solid #e2e8f0', fontSize:'16px', outline:'none', background:'#fff'}} />
              <button disabled={uploading} style={{background:'#0f172a', color:'#fff', border:'none', borderRadius:'15px', width:'60px', height:'60px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}><Send size={24}/></button>
           </form>
        </div>
      )}
    </div>
  );
}

// --- 3. PÁGINA HOME PRINCIPAL ---
export default function Home() {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNovoMenu, setShowNovoMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showConfigMenu, setShowConfigMenu] = useState(false);
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null);
  const [listaBoletos, setListaBoletos] = useState([]);
  const [listaPagar, setListaPagar] = useState([]); 
  const [listaReceber, setListaReceber] = useState([]); 
  const [listaRH, setListaRH] = useState([]);
  const [fileBoleto, setFileBoleto] = useState(null);
  const router = useRouter()

  useEffect(() => {
    const carregar = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/login')
      const { data: prof } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single()
      setUserProfile(prof)

      const { data: bolds } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido').order('id', {ascending: false})
      setListaBoletos((bolds || []).filter(t => prof?.funcao === 'Financeiro' ? (t.status === 'gerar_boleto' || t.status === 'validar_pix') : t.status === 'enviar_cliente'))

      const { data: pag } = await supabase.from('finan_pagar').select('*').neq('status', 'concluido').order('id', {ascending: false})
      const { data: rec } = await supabase.from('finan_receber').select('*').neq('status', 'concluido').order('id', {ascending: false})
      const { data: rhData } = await supabase.from('finan_rh').select('*').neq('status', 'concluido').order('id', {ascending: false})
      
      setListaRH(rhData || [])
      if (prof?.funcao === 'Financeiro') {
        setListaPagar((pag || []).filter(i => i.status === 'financeiro')); setListaReceber((rec || []).filter(i => i.status === 'financeiro'))
      } else {
        setListaPagar((pag || []).filter(i => i.status === 'pos_vendas')); setListaReceber((rec || []).filter(i => i.status === 'pos_vendas'))
      }
      setLoading(false)
    }
    carregar()
  }, [router])

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  const handleGerarBoletoFaturamento = async (id) => {
    if (!fileBoleto) return alert("Por favor, anexe o arquivo do boleto.")
    try {
      const path = `boletos/${Date.now()}-${fileBoleto.name}`
      await supabase.storage.from('anexos').upload(path, fileBoleto)
      const { data } = supabase.storage.from('anexos').getPublicUrl(path)
      await supabase.from('Chamado_NF').update({ status: 'enviar_cliente', tarefa: 'Enviar Boleto para o Cliente', setor: 'Pós-Vendas', anexo_boleto: data.publicUrl }).eq('id', id)
      alert("Sucesso! Tarefa gerada para o Pós Vendas."); window.location.reload()
    } catch (e) { alert(e.message) }
  }

  const handleMoverConcluidoPagar = async (id) => {
    await supabase.from('finan_pagar').update({ status: 'concluido' }).eq('id', id)
    alert("Movido para concluído!"); window.location.reload()
  }

  const handleMoverConcluidoRH = async (id) => {
    await supabase.from('finan_rh').update({ status: 'concluido' }).eq('id', id)
    alert("Chamado RH concluído!"); window.location.reload()
  }

  const handleGerarTarefaReceber = async (id) => {
    await supabase.from('finan_receber').update({ status: 'pos_vendas' }).eq('id', id)
    alert("Tarefa gerada para o Pós Vendas!"); window.location.reload()
  }

  const btnSidebarStyle = {
    background: 'none', color: '#000', border: 'none', padding: '20px 0', cursor: 'pointer',
    fontSize: '18px', fontWeight: '400', display: 'flex', alignItems: 'center', width: '100%', transition: '0.3s'
  }

  const iconContainer = {
    minWidth: '85px', display: 'flex', justifyContent: 'center', alignItems: 'center'
  }

  if (loading) return <LoadingScreen />

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Montserrat, sans-serif', background: 'transparent' }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600&display=swap" rel="stylesheet" />
      
      <GeometricBackground />

      <aside onMouseEnter={()=>setIsSidebarOpen(true)} onMouseLeave={()=>setIsSidebarOpen(false)} style={{ width: isSidebarOpen ? '320px' : '85px', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', height: '100vh', position: 'fixed', left: 0, top: 0, borderRight: '1px solid #cbd5e1', padding: '30px 0', display: 'flex', flexDirection: 'column', transition: '0.4s ease', zIndex: 1100, overflow: 'hidden' }}>
        <div style={{ flex: 1 }}>
            <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '40px' }}>
                {isSidebarOpen ? <span style={{color:'#000', fontSize:'22px', letterSpacing:'3px'}}>NOVA</span> : <Menu size={32} color="#000" />}
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column' }}>
                <button onClick={() => router.push('/')} style={btnSidebarStyle}><div style={iconContainer}><LayoutDashboard size={28} color="#000" /></div><span style={{ opacity: isSidebarOpen ? 1 : 0 }}>TAREFAS</span></button>
                <button onClick={() => router.push('/kanban')} style={btnSidebarStyle}><div style={iconContainer}><ClipboardList size={28} color="#000" /></div><span style={{ opacity: isSidebarOpen ? 1 : 0 }}>BOLETOS</span></button>
                <div style={{ height: '1px', background: '#e2e8f0', margin: '20px 0', opacity: isSidebarOpen ? 1 : 0 }}></div>
                <button onClick={() => router.push('/historico-pagar')} style={btnSidebarStyle}><div style={iconContainer}><TrendingDown size={28} color="#000" /></div><span style={{ opacity: isSidebarOpen ? 1 : 0 }}>Concluido- Contas a Pagar</span></button>
                <button onClick={() => router.push('/historico-receber')} style={btnSidebarStyle}><div style={iconContainer}><TrendingUp size={28} color="#000" /></div><span style={{ opacity: isSidebarOpen ? 1 : 0 }}>Concluido- Contas a Receber</span></button>
                <button onClick={() => router.push('/historico-rh')} style={btnSidebarStyle}><div style={iconContainer}><UserCheck size={28} color="#000" /></div><span style={{ opacity: isSidebarOpen ? 1 : 0 }}>Concluido-Chamado RH</span></button>
            </nav>
        </div>
        <div style={{ paddingBottom: '20px' }}>
            <button onClick={handleLogout} style={{ ...btnSidebarStyle, color: '#dc2626' }}><div style={iconContainer}><LogOut size={28} color="#dc2626" /></div><span style={{ opacity: isSidebarOpen ? 1 : 0 }}>SAIR</span></button>
        </div>
      </aside>

      <main style={{ marginLeft: isSidebarOpen ? '320px' : '85px', flex: 1, padding: '50px', zIndex: 1, position: 'relative', background: 'transparent', transition: '0.4s ease' }}>
        <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'60px' }}>
            <div><h1 style={{ fontWeight: '400', color: '#0f172a', margin: 0, fontSize:'32px', letterSpacing:'-1.5px' }}>Painel de Trabalho</h1><div style={{ width: '60px', height: '4px', background: '#0f172a', marginTop: '12px' }}></div></div>
            
            <div style={{ display:'flex', gap:'35px', alignItems:'center', position:'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(255,255,255,0.6)', padding: '12px 25px', borderRadius: '25px', border: '1px solid #cbd5e1', boxShadow: '0 8px 20px rgba(0,0,0,0.05)' }}>
                  <div style={{ width: '65px', height: '65px', borderRadius: '20px', overflow: 'hidden', background: '#000', border: '2px solid #fff', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }}>
                    {userProfile?.avatar_url ? <img src={userProfile.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover'}} /> : <User color="#fff" style={{padding:'12px'}} size={40}/>}
                  </div>
                  <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
                    <span style={{ display: 'block', fontSize: '16px', color: '#0f172a', letterSpacing:'-0.5px' }}>{userProfile?.nome?.toUpperCase()}</span>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>{userProfile?.funcao}</span>
                  </div>
                </div>

                <div onClick={() => setShowNotifMenu(!showNotifMenu)} style={{ cursor:'pointer', color:'#0f172a', position:'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bell size={36} strokeWidth={1.5} />
                  {showNotifMenu && (
                    <div onMouseLeave={() => setShowNotifMenu(false)} style={{ position: 'absolute', top: '55px', right: 0, background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(10px)', padding: '25px', borderRadius: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', border: '1px solid #cbd5e1', zIndex: 2000, width: '250px', textAlign: 'center' }}>
                      <span style={{ fontSize: '14px', color: '#64748b' }}>Sem notificação</span>
                    </div>
                  )}
                </div>

                <div onClick={() => setShowConfigMenu(!showConfigMenu)} style={{ cursor:'pointer', color:'#0f172a', position:'relative', display:'flex' }}>
                  <Settings size={36} strokeWidth={1.5} className="hover-rotate" />
                  {showConfigMenu && (
                    <div onMouseLeave={() => setShowConfigMenu(false)} style={{ position: 'absolute', top: '55px', right: 0, background: '#fff', padding: '10px 0', borderRadius: '15px', boxShadow: '0 15px 40px rgba(0,0,0,0.15)', border: '1px solid #cbd5e1', zIndex: 2000, width: '200px' }}>
                       <div onClick={() => router.push('/configuracoes')} style={{ padding: '15px 20px', cursor: 'pointer', fontSize: '14px', borderBottom: '1px solid #f1f5f9' }}>PERFIL</div>
                       <div style={{ padding: '15px 20px', fontSize: '14px', borderBottom: '1px solid #f1f5f9', opacity: 0.5 }}>SOM</div>
                       <div style={{ padding: '15px 20px', fontSize: '14px', opacity: 0.5 }}>TEMA</div>
                    </div>
                  )}
                </div>

                <button onClick={() => setShowNovoMenu(!showNovoMenu)} style={{ background:'#0f172a', color:'#fff', border:'none', padding:'20px 40px', borderRadius:'15px', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', gap:'12px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
                  <PlusCircle size={26} strokeWidth={2.5} /> NOVO CHAMADO
                </button>

                {showNovoMenu && (
                  <div onMouseLeave={() => setShowNovoMenu(false)} style={{ position:'absolute', top:'85px', right: 0, background:'#fff', borderRadius:'20px', boxShadow: '0 30px 60px rgba(0,0,0,0.2)', zIndex:2000, width:'320px', border:'1px solid #e2e8f0', overflow:'hidden' }}>
                    <div onClick={() => router.push('/novo-chamado-nf')} style={{ padding:'25px', cursor:'pointer', fontSize:'18px', borderBottom:'1px solid #f1f5f9' }} className="hover-item">CHAMADO DE BOLETO</div>
                    <div onClick={() => router.push('/novo-pagar-receber')} style={{ padding:'25px', cursor:'pointer', fontSize:'18px', borderBottom:'1px solid #f1f5f9' }} className="hover-item">CONTAS PAGAR / RECEBER</div>
                    <div onClick={() => router.push('/novo-chamado-rh')} style={{ padding:'25px', cursor:'pointer', fontSize:'18px', color: '#2563eb' }} className="hover-item">CHAMADO RH</div>
                  </div>
                )}
            </div>
        </header>

        <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* COLUNA 1 - FATURAMENTO */}
            <div style={{flex: 1, minWidth: '380px', display: 'flex', flexDirection: 'column', gap: '30px'}}><div style={{padding: '15px', textAlign: 'center', fontSize: '24px', color: '#0f172a'}}>FATURAMENTO</div>
                {(listaBoletos || []).map(t => (
                  <div key={t.id} onClick={() => setTarefaSelecionada({ ...t, gTipo: 'boleto' })} style={{ background: 'rgba(255,255,255,0.92)', borderRadius: '15px', border: '1px solid #cbd5e1', cursor: 'pointer', overflow: 'hidden', boxShadow: '0 10px 15px rgba(0,0,0,0.05)' }}>
                    <div style={{ background: '#1e293b', padding: '25px', color: '#fff' }}>
                        <span style={{ fontSize: '24px' }}>{t.nom_cliente?.toUpperCase()}</span>
                    </div>
                    <div style={{ padding: '25px', fontSize: '18px' }}>{t.forma_pagamento?.toUpperCase()}</div>
                  </div>
                ))}
            </div>
            {/* COLUNA 2 - CONTAS PAGAR / RECEBER */}
            <div style={{flex: 1, minWidth: '380px', display: 'flex', flexDirection: 'column', gap: '30px'}}><div style={{padding: '15px', textAlign: 'center', fontSize: '24px', color: '#0f172a'}}>CONTAS PAGAR / RECEBER</div>
                {(listaPagar || []).map(t => (
                  <div key={t.id} onClick={() => setTarefaSelecionada({ ...t, gTipo: 'pagar' })} style={{ background: 'rgba(255,255,255,0.92)', padding: '30px', borderRadius: '15px', borderTop:'1px solid #cbd5e1', borderRight:'1px solid #cbd5e1', borderBottom:'1px solid #cbd5e1', borderLeft:'8px solid #ef4444', cursor:'pointer', marginBottom:'15px' }}>
                    <span style={{fontSize:'20px'}}>{t.fornecedor?.toUpperCase()}</span><br/><span>{t.forma_pagamento?.toUpperCase() || 'PAGAMENTO'}</span>
                  </div>
                ))}
                {(listaReceber || []).map(t => (
                  <div key={t.id} onClick={() => setTarefaSelecionada({ ...t, gTipo: 'receber' })} style={{ background: 'rgba(255,255,255,0.92)', padding: '30px', borderRadius: '15px', borderTop:'1px solid #cbd5e1', borderRight:'1px solid #cbd5e1', borderBottom:'1px solid #cbd5e1', borderLeft:'8px solid #3b82f6', cursor:'pointer' }}>
                    <span style={{fontSize:'20px'}}>{t.cliente?.toUpperCase()}</span><br/><span>{t.forma_pagamento?.toUpperCase() || 'RECEBIMENTO'}</span>
                  </div>
                ))}
            </div>
            {/* COLUNA 3 - RH */}
            <div style={{flex: 1, minWidth: '380px', display: 'flex', flexDirection: 'column', gap: '30px'}}><div style={{padding: '15px', textAlign: 'center', fontSize: '24px', color: '#0f172a'}}>RH</div>
                {(listaRH || []).map(t => (<div key={t.id} onClick={() => setTarefaSelecionada({ ...t, gTipo: 'rh' })} style={{ background: 'rgba(255,255,255,0.92)', padding: '30px', borderRadius: '15px', border: '1px solid #cbd5e1', cursor: 'pointer' }}><h4 style={{margin:'8px 0', fontSize:'20px'}}>{(t.funcionario || t.titulo || 'RH').toUpperCase()}</h4></div>))}
            </div>
        </div>
      </main>

      {/* MODAL GIGANTE (ABERTO COM TODAS AS INFORMAÇÕES E CHAT SEPARADO) */}
      {tarefaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', width: '1600px', maxWidth: '98%', maxHeight: '95vh', borderRadius: '35px', display: 'flex', flexDirection: 'row', overflow: 'hidden', border: '1px solid #cbd5e1', boxShadow: '0 50px 100px rgba(0,0,0,0.2)' }}>
            
            <div style={{ flex: '1.2', padding: '60px', overflowY: 'auto' }}>
              <button onClick={() => {setTarefaSelecionada(null); setFileBoleto(null)}} style={{ background: '#0f172a', border: 'none', color: '#fff', padding: '12px 25px', borderRadius: '12px', cursor: 'pointer', fontSize:'12px', marginBottom: '30px', display:'flex', alignItems:'center', gap:'8px' }}><ArrowLeft size={16}/> VOLTAR AO PAINEL</button>
              
              <div style={{ marginBottom: '50px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8', letterSpacing: '2px' }}>NOME DO CLIENTE / FORNECEDOR</span>
                <h2 style={{ fontSize: '56px', color: '#0f172a', margin: '5px 0', lineHeight: 1 }}>{(tarefaSelecionada?.nom_cliente || tarefaSelecionada?.fornecedor || tarefaSelecionada?.cliente || tarefaSelecionada?.funcionario)?.toUpperCase()}</h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
                <div style={{ padding: '30px', background: '#f8fafc', borderRadius: '25px', border: '1px solid #e2e8f0' }}>
                   <span style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '1px', display:'block', marginBottom: '10px' }}>MÉTODO DE PAGAMENTO</span>
                   <span style={{ fontSize: '32px', color: '#0f172a' }}>{tarefaSelecionada?.forma_pagamento?.toUpperCase() || 'NÃO INFORMADO'}</span>
                </div>
                <div style={{ padding: '30px', background: '#f8fafc', borderRadius: '25px', border: '1px solid #e2e8f0' }}>
                   <span style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '1px', display:'block', marginBottom: '10px' }}>DATA DE VENCIMENTO</span>
                   <span style={{ fontSize: '32px', color: '#0f172a' }}>{formatarData(tarefaSelecionada?.vencimento_boleto || tarefaSelecionada?.data_vencimento || tarefaSelecionada?.datas_parcelas) || 'IMEDIATO'}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                 <div className="info-block"><label>ID DO PROCESSO</label><span>#{tarefaSelecionada.id}</span></div>
                 <div className="info-block"><label>VALOR TOTAL</label><span>R$ {tarefaSelecionada?.valor || tarefaSelecionada?.valor_servico}</span></div>
                 <div className="info-block"><label>NF SERVIÇO</label><span>{tarefaSelecionada.num_nf_servico || '-'}</span></div>
                 <div className="info-block"><label>NF PEÇA</label><span>{tarefaSelecionada.num_nf_peca || '-'}</span></div>
                 <div className="info-block"><label>STATUS ATUAL</label><span>{tarefaSelecionada.status?.toUpperCase()}</span></div>
                 <div className="info-block"><label>QTD PARCELAS</label><span>{tarefaSelecionada.qtd_parcelas || '1'}x</span></div>
              </div>

              <div style={{ marginTop: '40px', display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                {userProfile?.funcao === 'Financeiro' && tarefaSelecionada.gTipo === 'pagar' && (
                   <button onClick={() => handleMoverConcluidoPagar(tarefaSelecionada.id)} style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '15px 30px', borderRadius: '15px', cursor: 'pointer', fontSize: '14px', display:'flex', alignItems:'center', gap:'10px' }}><CheckCircle size={18}/> Mover para concluido</button>
                )}
                {userProfile?.funcao === 'Financeiro' && tarefaSelecionada.gTipo === 'rh' && (
                   <button onClick={() => handleMoverConcluidoRH(tarefaSelecionada.id)} style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '15px 30px', borderRadius: '15px', cursor: 'pointer', fontSize: '14px', display:'flex', alignItems:'center', gap:'10px' }}><CheckCircle size={18}/> Mover para concluido</button>
                )}
                {tarefaSelecionada.gTipo === 'receber' && (
                   <button onClick={() => handleGerarTarefaReceber(tarefaSelecionada.id)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '15px 30px', borderRadius: '15px', cursor: 'pointer', fontSize: '14px', display:'flex', alignItems:'center', gap:'10px' }}><Send size={18}/> Gerar tarefa para Pos Vendas: Receber</button>
                )}
              </div>

              <div style={{ marginTop: '40px', display: 'flex', gap: '15px' }}>
                {tarefaSelecionada.anexo_nf_servico && <a href={tarefaSelecionada.anexo_nf_servico} target="_blank" style={{ padding: '15px 25px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '15px', textDecoration: 'none', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}><FileText size={20}/> NF SERVIÇO</a>}
                {tarefaSelecionada.anexo_nf_peca && <a href={tarefaSelecionada.anexo_nf_peca} target="_blank" style={{ padding: '15px 25px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '15px', textDecoration: 'none', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}><FileText size={20}/> NF PEÇA</a>}
              </div>

              {userProfile?.funcao === 'Financeiro' && tarefaSelecionada.status === 'gerar_boleto' && (
                <div style={{ marginTop: '50px', padding: '40px', background: '#f0f9ff', borderRadius: '30px', border: '1px solid #bae6fd' }}>
                    <span style={{ fontSize: '11px', color: '#0369a1', letterSpacing: '2px', display:'block', marginBottom: '20px' }}>AÇÃO DO FINANCEIRO</span>
                    <label style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'15px', background:'#fff', padding:'25px', borderRadius:'20px', border:'2px dashed #3b82f6', cursor:'pointer', marginBottom:'25px' }}>
                        <Upload size={32} color="#3b82f6" />
                        <div style={{textAlign:'left'}}><span style={{fontSize:'16px', color:'#1d4ed8', display:'block'}}>{fileBoleto ? fileBoleto.name : 'CLIQUE PARA ANEXAR O BOLETO'}</span><span style={{fontSize:'12px', color:'#60a5fa'}}>Clique para selecionar o arquivo</span></div>
                        <input type="file" hidden onChange={e => setFileBoleto(e.target.files[0])} />
                    </label>
                    <button onClick={() => handleGerarBoletoFaturamento(tarefaSelecionada.id)} style={{ width: '100%', background: '#0f172a', color: '#fff', padding: '22px', borderRadius: '20px', cursor: 'pointer', fontSize: '16px', display:'flex', alignItems:'center', justifyContent:'center', gap:'12px' }}>
                        <Send size={20}/> Gerar Tarefa para Pós Vendas: Enviar Boleto
                    </button>
                </div>
              )}
            </div>

            <div style={{ flex: '0.8', padding: '40px', background: '#f8fafc', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
              {userProfile && <ChatChamado chamadoId={tarefaSelecionada?.id} userProfile={userProfile} />}
            </div>

          </div>
        </div>
      )}

      {userProfile && <ChatFlutuante userProfile={userProfile} />}
      
      <style jsx global>{`
        * { font-weight: 400 !important; }
        .sidebar-btn { background:none; color:#000; border:none; padding:20px 0; cursor:pointer; fontSize:18px; display:flex; alignItems:center; width:100%; transition:0.3s; }
        .sidebar-btn:hover { background: rgba(0,0,0,0.05); }
        .icon-box { min-width: 85px; display:flex; justifyContent:center; alignItems:center; }
        .info-block { padding: 20px; border: 1px solid #e2e8f0; borderRadius: 20px; background: #fff; }
        .info-block label { display: block; fontSize: 10px; color: #94a3b8; letter-spacing: 1px; margin-bottom: 5px; }
        .info-block span { fontSize: 20px; color: #0f172a; }
        .hover-rotate:hover { transform: rotate(45deg); transition: 0.3s; }
        .menu-item:hover { background: #f8fafc; }
        .tooltip-container { position: relative; display: flex; align-items: center; }
        .tooltip-box { visibility: hidden; background-color: #000; color: #fff; text-align: center; padding: 12px 18px; border-radius: 12px; position: absolute; z-index: 5000; bottom: 125%; right: 0; width: 300px; font-size: 15px; opacity: 0; transition: 0.3s; box-shadow: 0 10px 30px rgba(0,0,0,0.4); pointer-events: none; }
        .tooltip-container:hover .tooltip-box { visibility: visible; opacity: 1; }
      `}</style>
    </div>
  )
}