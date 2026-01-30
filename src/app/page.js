'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
// IMPORTAÇÃO DE ÍCONES COMPLETA
import { 
  Bell, MessageSquare, X, Menu, PlusCircle, FileText, Download, 
  CheckCircle, LogOut, User, ShieldCheck, Upload, Send, 
  Calendar, CreditCard, Hash, History, ArrowLeft, Paperclip, ImageIcon, CheckCheck, Eye
} from 'lucide-react'

// --- TELA DE CARREGAMENTO ---
function LoadingScreen() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;900&display=swap" rel="stylesheet" />
        <h1 style={{ color: '#fff', fontFamily: 'Montserrat, sans-serif', fontWeight: '300', fontSize: '28px', letterSpacing: '4px', textTransform: 'uppercase', textAlign: 'center', lineHeight: '1.4' }}>
            Comunicação Financeiro <br /> 
            <b style={{ fontWeight: '900', fontSize: '32px' }}>Nova Tratores</b>
        </h1>
    </div>
  )
}

const formatarData = (dataStr) => {
  if (!dataStr || dataStr === 'null' || typeof dataStr !== 'string') return '';
  const partes = dataStr.split('-');
  if (partes.length !== 3) return dataStr; 
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
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
      <div style={{ padding: '15px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: '900', fontSize: '10px', color: '#64748b' }}>CONVERSA DO PROCESSO</div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {(mensagens || []).map((m) => (
          <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile?.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile?.id) ? '#1e293b' : '#f1f5f9', color: String(m.usuario_id) === String(userProfile?.id) ? '#fff' : '#000', padding: '12px 18px', borderRadius: '15px', maxWidth: '85%' }}>
            <b style={{ fontSize: '8px', opacity: 0.5, display: 'block', marginBottom: '4px' }}>{m.usuario_nome?.toUpperCase()}</b>
            <span style={{ fontSize: '14px' }}>{m.texto}</span>
          </div>
        ))}
      </div>
      <form onSubmit={enviar} style={{ padding: '15px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px' }}>
        <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Mensagem..." style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
        <button style={{ background: '#1e293b', color: '#fff', border: 'none', borderRadius: '10px', width: '45px' }}><Send size={18} /></button>
      </form>
    </div>
  )
}

// --- 2. CHAT FLUTUANTE GERAL (GIGANTE + TOOLTIP DE VISUALIZAÇÃO) ---
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
      p => { 
        if (p.eventType === 'INSERT' && !p.new.chamado_id) setMensagens(prev => [...(prev || []), p.new])
        if (p.eventType === 'UPDATE') setMensagens(prev => (prev || []).map(m => m.id === p.new.id ? p.new : m))
      }
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
        <div style={{ position: 'absolute', bottom: '95px', right: 0, width: '500px', height: '750px', background: '#fff', borderRadius: '35px', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 70px rgba(0,0,0,0.3)', border:'1px solid #e2e8f0', overflow:'hidden' }}>
           <div style={{ padding: '25px', background: '#0f172a', color: '#fff', fontWeight: '900', fontSize:'18px' }}>CENTRAL DE COMUNICAÇÃO NOVA</div>
           
           <div ref={scrollRef} style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', background:'#f8fafc' }}>
              {(mensagens || []).map(m => {
                const souEu = String(m.usuario_id) === String(userProfile.id);
                const hora = m.data_hora ? new Date(m.data_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                const quemViu = (m.visualizado_por || []).filter(v => v.id !== m.usuario_id).map(v => v.nome).join(', ');

                return (
                  <div key={m.id} style={{ alignSelf: souEu ? 'flex-end' : 'flex-start', maxWidth:'80%' }}>
                    <div style={{ background: souEu ? '#0f172a' : '#fff', color: souEu ? '#fff' : '#000', padding: '15px', borderRadius: '20px', border:'1px solid #e2e8f0', boxShadow: '0 5px 10px rgba(0,0,0,0.03)' }}>
                      <b style={{fontSize:'10px', display:'block', opacity:0.6, marginBottom:'6px'}}>{m.usuario_nome?.toUpperCase()}</b>
                      
                      {m.midia_url && (
                        <div style={{marginBottom:'12px'}}>
                          {m.midia_url.match(/\.(jpeg|jpg|gif|png)$/) 
                            ? <img src={m.midia_url} style={{width:'100%', borderRadius:'12px', cursor:'pointer'}} onClick={()=>window.open(m.midia_url)} />
                            : <a href={m.midia_url} target="_blank" style={{display:'flex', alignItems:'center', gap:'10px', background:'rgba(0,0,0,0.07)', padding:'12px', borderRadius:'12px', textDecoration:'none', color:'inherit', fontSize:'13px', fontWeight:'700'}}><FileText size={18}/> VER DOCUMENTO</a>}
                        </div>
                      )}
                      
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

           <form onSubmit={enviar} style={{ padding: '25px', display: 'flex', gap: '15px', borderTop:'1px solid #e2e8f0', background:'#fff', alignItems:'center' }}>
              <label style={{cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', width:'55px', height:'55px', borderRadius:'15px', background:'#f1f5f9', color:'#64748b'}}>
                <Paperclip size={26} />
                <input type="file" hidden onChange={handleUpload} disabled={uploading} />
              </label>
              <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder={uploading ? "Subindo arquivo..." : "Escreva sua mensagem..."} style={{flex:1, padding:'18px', borderRadius:'15px', border:'1px solid #e2e8f0', fontSize:'16px', outline:'none', background:'#f8fafc'}} />
              <button disabled={uploading} style={{background:'#0f172a', color:'#fff', border:'none', borderRadius:'15px', width:'60px', height:'60px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}><Send size={24}/></button>
           </form>
        </div>
      )}
    </div>
  );
}

// --- 3. PÁGINA HOME PRINCIPAL ---
export default function Home() {
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [showNovoMenu, setShowNovoMenu] = useState(false)
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null)
  const [listaBoletos, setListaBoletos] = useState([])
  const [listaPagar, setListaPagar] = useState([])
  const [listaReceber, setListaReceber] = useState([])
  const [listaRH, setListaRH] = useState([])
  const [fileBoleto, setFileBoleto] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const carregar = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/login')
      const { data: prof } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single()
      setUserProfile(prof)

      const { data: bolds } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido').order('id', {ascending: false})
      setListaBoletos((bolds || []).filter(t => {
        if (prof?.funcao === 'Financeiro') return t.status === 'gerar_boleto' || t.status === 'validar_pix'
        if (prof?.funcao === 'Pós-Vendas') return t.status === 'enviar_cliente'
        return false
      }))

      const { data: pag } = await supabase.from('finan_pagar').select('*').neq('status', 'concluido').order('id', {ascending: false})
      const { data: rec } = await supabase.from('finan_receber').select('*').neq('status', 'concluido').order('id', {ascending: false})
      const { data: rhData } = await supabase.from('finan_rh').select('*').neq('status', 'concluido').order('id', {ascending: false})
      
      setListaRH(rhData || [])
      if (prof?.funcao === 'Financeiro') {
        setListaPagar((pag || []).filter(i => i.status === 'financeiro'))
        setListaReceber((rec || []).filter(i => i.status === 'financeiro'))
      } else {
        setListaPagar((pag || []).filter(i => i.status === 'pos_vendas'))
        setListaReceber((rec || []).filter(i => i.status === 'pos_vendas'))
      }
      setLoading(false)
    }
    carregar()
  }, [router])

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  const handleGerarBoletoFaturamento = async (id) => {
    if (!fileBoleto) return alert("Anexe o boleto primeiro.")
    try {
      const path = `boletos/${Date.now()}-${fileBoleto.name}`
      await supabase.storage.from('anexos').upload(path, fileBoleto)
      const { data } = supabase.storage.from('anexos').getPublicUrl(path)
      await supabase.from('Chamado_NF').update({ status: 'enviar_cliente', tarefa: 'Enviar Boleto para o Cliente', setor: 'Pós-Vendas', anexo_boleto: data.publicUrl }).eq('id', id)
      alert("Sucesso!"); window.location.reload()
    } catch (e) { alert(e.message) }
  }

  const handleMoverPagamentoEfetuado = async (id) => {
    await supabase.from('Chamado_NF').update({ status: 'concluido', tarefa: 'Pagamento Confirmado' }).eq('id', id)
    alert("Processo finalizado!"); window.location.reload()
  }

  const colContainer = { flex: 1, minWidth: '340px', display: 'flex', flexDirection: 'column', gap: '25px' }
  const colHeader = { background: 'rgba(255,255,255,0.9)', padding: '15px', borderRadius: '12px', textAlign: 'center', fontWeight: '900', fontSize: '12px', border: '1px solid #cbd5e1', color: '#0f172a', letterSpacing: '1px' }

  if (loading) return <LoadingScreen />

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Montserrat, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;900&display=swap" rel="stylesheet" />
      <div style={{ position: 'fixed', inset: 0, background: '#f1f5f9', zIndex: 0 }}></div>

      <aside onMouseEnter={()=>setIsSidebarOpen(true)} onMouseLeave={()=>setIsSidebarOpen(false)} style={{ width: isSidebarOpen ? '280px' : '65px', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', height: '100vh', position: 'fixed', left: 0, top: 0, borderRight: '1px solid #cbd5e1', padding: '30px 15px', display: 'flex', flexDirection: 'column', transition: '0.4s ease', zIndex: 1100, overflow: 'hidden' }}>
        <div style={{ opacity: isSidebarOpen ? 1 : 0, transition:'0.2s', whiteSpace:'nowrap', flex: 1 }}>
            <b style={{display:'block', marginBottom:'40px', textAlign:'center', color:'#0f172a', fontSize:'18px', fontWeight: '900', letterSpacing:'3px'}}>NOVA</b>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button onClick={() => router.push('/')} style={{ background:'#0f172a', color:'#fff', border:'none', padding:'15px', borderRadius:'10px', textAlign:'left', fontWeight:'900', cursor:'pointer', fontSize:'12px' }}>TAREFAS</button>
                <button onClick={() => router.push('/kanban')} style={{ background:'none', color:'#475569', border:'none', padding:'15px', textAlign:'left', fontWeight:'700', cursor:'pointer', fontSize:'12px' }}>BOLETOS</button>
                <div style={{padding: '20px 15px 10px', fontSize: '10px', fontWeight: '900', color: '#94a3b8', letterSpacing: '1px'}}>HISTÓRICOS</div>
                <button onClick={() => router.push('/historico-pagar')} style={{ background:'none', color:'#475569', border:'none', padding:'12px 15px', textAlign:'left', fontWeight:'700', cursor:'pointer', fontSize:'12px', display: 'flex', alignItems:'center', gap:'8px' }}><History size={14}/> PAGAR</button>
                <button onClick={() => router.push('/historico-receber')} style={{ background:'none', color:'#475569', border:'none', padding:'12px 15px', textAlign:'left', fontWeight:'700', cursor:'pointer', fontSize:'12px', display: 'flex', alignItems:'center', gap:'8px' }}><History size={14}/> RECEBER</button>
            </nav>
        </div>
        <div style={{ opacity: isSidebarOpen ? 1 : 0, transition: '0.2s', padding: '20px 0' }}><button onClick={handleLogout} style={{ width: '100%', background: '#fee2e2', color: '#dc2626', border: 'none', padding: '15px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '900', fontSize: '12px', cursor: 'pointer' }}><LogOut size={18} /> SAIR</button></div>
        {!isSidebarOpen && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#cbd5e1' }}><Menu size={24} strokeWidth={1.5} /></div>}
      </aside>

      <main style={{ marginLeft: '85px', flex: 1, padding: '50px', zIndex: 1, position: 'relative' }}>
        <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'60px' }}>
            <div><h1 style={{ fontWeight: '900', color: '#0f172a', margin: 0, fontSize:'32px', letterSpacing:'-1.5px' }}>Painel de Trabalho</h1><div style={{ width: '60px', height: '4px', background: '#0f172a', marginTop: '12px' }}></div></div>
            <div style={{ display:'flex', gap:'25px', alignItems:'center', position:'relative' }}>
                <button onClick={() => setShowNovoMenu(!showNovoMenu)} style={{ background:'#0f172a', color:'#fff', border:'none', padding:'14px 25px', borderRadius:'8px', fontWeight:'900', cursor:'pointer', fontSize:'11px', letterSpacing: '1px', display:'flex', alignItems:'center', gap:'8px' }}><PlusCircle size={16} strokeWidth={2} /> NOVO CHAMADO</button>
                {showNovoMenu && (<div style={{ position:'absolute', top:'60px', right: 40, background:'#fff', borderRadius:'12px', boxShadow:'0 15px 40px rgba(0,0,0,0.1)', zIndex:2000, width:'250px', border:'1px solid #e2e8f0', overflow:'hidden' }}><div onClick={() => router.push('/novo-chamado-nf')} style={{ padding:'18px', cursor:'pointer', fontSize:'12px', fontWeight:'700', borderBottom:'1px solid #f1f5f9' }}>CHAMADO DE BOLETO</div><div onClick={() => router.push('/novo-pagar-receber')} style={{ padding:'18px', cursor:'pointer', fontSize:'12px', fontWeight:'700' }}>CONTAS PAGAR / RECEBER</div></div>)}
                <div style={{cursor:'pointer', color:'#0f172a', position:'relative'}}><Bell size={24} strokeWidth={1.5} /></div>
            </div>
        </header>

        <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={colContainer}><div style={colHeader}>FATURAMENTO</div>
            {(listaBoletos || []).map(t => (
              <div key={t.id} onClick={() => setTarefaSelecionada({ ...t, gTipo: 'boleto' })} style={{ background: '#fff', borderRadius: '15px', border: '1px solid #cbd5e1', cursor: 'pointer', transition: '0.2s ease', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', position: 'relative', zIndex: 10 }}>
                <div style={{ background: '#1e293b', padding: '20px', color: '#fff' }}>
                    <h4 style={{ margin: 0, fontSize: '24px', fontWeight: '400', color: '#fff' }}>{t.nom_cliente?.toUpperCase()}</h4>
                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div><span style={{ fontSize: '10px', opacity: 0.7, fontWeight: 'bold', display: 'block' }}>VALOR TOTAL</span><b style={{ fontSize: '26px', color: '#38bdf8' }}>R$ {t.valor_servico}</b></div>
                        <div style={{ textAlign: 'right' }}><CreditCard size={14} style={{ marginBottom: '4px', opacity: 0.7 }} /><b style={{ fontSize: '12px', display: 'block' }}>{t.forma_pagamento?.toUpperCase()}</b></div>
                    </div>
                </div>
                <div style={{ padding: '20px' }}>
                    <div style={{ display:'grid', gridTemplateColumns: '1fr 1fr', gap:'15px', fontSize:'10px' }}>
                        <div><label style={{display:'block', fontWeight:'900', color:'#94a3b8'}}>ID PROCESSO</label><b>#{t.id}</b></div>
                        <div><label style={{display:'block', fontWeight:'900', color:'#94a3b8'}}>TAREFA</label><b style={{ color: '#3b82f6'}}>{t.tarefa?.toUpperCase()}</b></div>
                    </div>
                    <div style={{ marginTop:'15px', display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                        <Calendar size={14} color="#ef4444" />
                        <span style={{ fontSize: '10px', fontWeight: '900', color: '#ef4444' }}>VENCIMENTOS:</span>
                        <b style={{ fontSize: '11px' }}>{t.datas_parcelas && typeof t.datas_parcelas === 'string' ? t.datas_parcelas.split(',').map(d => formatarData(d.trim())).join(' | ') : formatarData(t.vencimento_boleto) || 'Imediato'}</b>
                    </div>
                </div>
              </div>
            ))}
          </div>

          <div style={colContainer}><div style={{ ...colHeader, borderBottomColor:'#3b82f6' }}>CONTAS PAGAR / RECEBER</div>
            {(listaPagar || []).map(t => (<div key={t.id} onClick={() => setTarefaSelecionada({ ...t, gTipo: 'pagar' })} style={{ background: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #cbd5e1', borderLeft:'8px solid #ef4444', cursor:'pointer', marginBottom:'15px' }}><span style={{fontSize:'9px', fontWeight:'900', color:'#ef4444', letterSpacing:'1px'}}>A PAGAR</span><h4 style={{margin:'8px 0', fontSize:'15px', fontWeight:'400', color:'#0f172a'}}>{t.fornecedor?.toUpperCase()}</h4><b style={{fontSize:'16px', color:'#0f172a'}}>R$ {t.valor}</b></div>))}
            {(listaReceber || []).map(t => (<div key={t.id} onClick={() => setTarefaSelecionada({ ...t, gTipo: 'receber' })} style={{ background: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #cbd5e1', borderLeft:'10px solid #3b82f6', cursor:'pointer' }}><span style={{fontSize:'9px', fontWeight:'900', color:'#3b82f6', letterSpacing:'1px'}}>A RECEBER</span><h4 style={{margin:'8px 0', fontSize:'15px', fontWeight:'400', color:'#0f172a'}}>{t.cliente?.toUpperCase()}</h4><b style={{fontSize:'16px', color:'#0f172a'}}>R$ {t.valor}</b></div>))}
          </div>

          <div style={colContainer}><div style={{ ...colHeader, borderBottomColor:'#94a3b8' }}>RH</div>
            {(listaRH || []).map(t => (<div key={t.id} onClick={() => setTarefaSelecionada({ ...t, gTipo: 'rh' })} style={{ background: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #cbd5e1', cursor: 'pointer' }}><span style={{fontSize:'9px', fontWeight:'900', color:'#94a3b8'}}>TASK RH</span><h4 style={{margin:'8px 0', fontSize:'15px', fontWeight:'400'}}>{(t.funcionario || t.titulo || 'RH').toUpperCase()}</h4></div>))}
          </div>
        </div>
      </main>

      {tarefaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', width: '1200px', maxWidth: '95%', maxHeight: '90vh', borderRadius: '25px', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden', border: '1px solid #cbd5e1', boxShadow: '0 50px 100px rgba(0,0,0,0.2)' }}>
            <div style={{ flex: '1 1 600px', padding: '40px 60px', overflowY: 'auto', maxHeight: '90vh' }}>
              <button onClick={() => setTarefaSelecionada(null)} style={{ background: '#0f172a', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', fontSize:'9px', marginBottom: '30px', display:'flex', alignItems:'center', gap:'5px' }}><ArrowLeft size={14}/> VOLTAR</button>
              <div style={{ marginBottom: '40px' }}><b style={{ fontSize: '18px', color: '#3b82f6', fontWeight: '800' }}>#{tarefaSelecionada.id}</b><h2 style={{ color: '#0f172a', margin: '5px 0 0 0', fontSize:'42px', fontWeight:'100' }}>{ (tarefaSelecionada?.nom_cliente || tarefaSelecionada?.fornecedor || tarefaSelecionada?.cliente)?.toUpperCase() }</h2></div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', border: '1px solid #e2e8f0', background: '#fcfcfc', borderRadius:'15px', overflow:'hidden', marginBottom: '30px' }}>
                 <div style={{ padding: '25px', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}><label style={{fontSize:'10px', color: '#94a3b8', fontWeight:'900', display:'block', marginBottom:'10px'}}>VALOR TOTAL</label><b style={{fontSize:'28px', fontWeight:'900', color:'#0f172a'}}>R$ {tarefaSelecionada?.valor || tarefaSelecionada?.valor_servico}</b></div>
                 <div style={{ padding: '25px', borderBottom: '1px solid #e2e8f0' }}><label style={{fontSize:'10px', color: '#94a3b8', fontWeight:'900', display:'block', marginBottom:'10px'}}>PAGAMENTO</label><b style={{fontSize: '18px', fontWeight: '700', color: '#334155'}}>{tarefaSelecionada?.forma_pagamento?.toUpperCase()}</b></div>
                 <div style={{ padding: '25px', borderRight: '1px solid #e2e8f0' }}><label style={{fontSize:'10px', color: '#94a3b8', fontWeight:'900', display:'block', marginBottom:'10px'}}>VENCIMENTOS</label><b style={{fontSize: '14px', fontWeight: '700', color: '#334155'}}>
                   {tarefaSelecionada?.datas_parcelas && typeof tarefaSelecionada.datas_parcelas === 'string' ? tarefaSelecionada.datas_parcelas.split(',').map(d => formatarData(d.trim())).join(' | ') : formatarData(tarefaSelecionada?.vencimento_boleto) || 'IMEDIATO'}
                 </b></div>
                 <div style={{ padding: '25px' }}><label style={{fontSize:'10px', color: '#94a3b8', fontWeight:'900', display:'block', marginBottom:'10px'}}>NOTAS FISCAIS</label><b style={{fontSize: '14px', fontWeight: '700', color: '#334155'}}>{tarefaSelecionada.num_nf_servico && `S: ${tarefaSelecionada.num_nf_servico}`} {tarefaSelecionada.num_nf_peca && `| P: ${tarefaSelecionada.num_nf_peca}`}</b></div>
              </div>

              {userProfile?.funcao === 'Financeiro' && tarefaSelecionada.status === 'gerar_boleto' && (
                <div style={{ background: '#eff6ff', padding: '35px', borderRadius: '15px', border: '1px solid #3b82f6', marginBottom: '35px' }}>
                    {['Pix', 'Cartão a vista', 'Cartão Parcelado'].includes(tarefaSelecionada.forma_pagamento) ? (
                        <button onClick={() => handleMoverPagamentoEfetuado(tarefaSelecionada.id)} style={{ width: '100%', background: '#16a34a', color: '#fff', padding: '20px', borderRadius: '12px', fontWeight: '900', border: 'none', cursor: 'pointer', fontSize: '15px' }}>Mover para Pagamento efetuado</button>
                    ) : (
                        <>
                            <h3 style={{ fontSize: '15px', margin: '0 0 20px 0', color: '#1e3a8a', fontWeight: '900' }}>GERAR BOLETO:</h3>
                            <label style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'15px', background:'#fff', padding:'25px', borderRadius:'12px', border:'2px dashed #3b82f6', cursor:'pointer', marginBottom:'20px' }}>
                                <Upload size={28} color="#3b82f6" />
                                <div style={{textAlign:'left'}}><span style={{fontSize:'16px', fontWeight:'800', color:'#1d4ed8', display:'block'}}>{fileBoleto ? fileBoleto.name : 'CLIQUE PARA ANEXAR'}</span><span style={{fontSize:'11px', color:'#60a5fa'}}>PDF, JPG, PNG</span></div>
                                <input type="file" hidden onChange={e => setFileBoleto(e.target.files[0])} />
                            </label>
                            <button onClick={() => handleGerarBoletoFaturamento(tarefaSelecionada.id)} style={{ width: '100%', background: '#1e3a8a', color: '#fff', padding: '20px', borderRadius: '12px', fontWeight: '900', border: 'none', cursor: 'pointer', fontSize: '14px', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px' }}>
                                <Send size={18}/> Gerar tarefa para Pós Vendas: Enviar Boleto
                            </button>
                        </>
                    )}
                </div>
              )}

              <div style={{ marginTop: '40px', display: 'flex', flexWrap:'wrap', gap: '12px' }}>
                {tarefaSelecionada.anexo_nf_servico && <a href={tarefaSelecionada.anexo_nf_servico} target="_blank" className="btn-anexo"><FileText size={18}/> NF SERVIÇO</a>}
                {tarefaSelecionada.anexo_nf_peca && <a href={tarefaSelecionada.anexo_nf_peca} target="_blank" className="btn-anexo"><FileText size={18}/> NF PEÇA</a>}
                {tarefaSelecionada.anexo_boleto && <a href={tarefaSelecionada.anexo_boleto} target="_blank" className="btn-anexo" style={{background:'#1e3a8a', color:'#fff', border:'none'}}><Download size={18}/> BAIXAR BOLETO</a>}
                {tarefaSelecionada.comprovante_pagamento && <a href={tarefaSelecionada.comprovante_pagamento} target="_blank" className="btn-anexo" style={{color:'#16a34a', borderColor:'#22c55e'}}><CheckCircle size={18}/> COMPROVANTE</a>}
              </div>
            </div>
            <div style={{ flex: '1 1 400px', padding: '40px', background: '#f8fafc', borderLeft: '1px solid #e2e8f0', maxHeight: '90vh' }}>
              {userProfile && <ChatChamado chamadoId={tarefaSelecionada?.id} userProfile={userProfile} />}
            </div>
          </div>
        </div>
      )}

      {userProfile && <ChatFlutuante userProfile={userProfile} />}
      
      {/* ESTILOS DO TOOLTIP CUSTOMIZADO */}
      <style jsx global>{`
        .btn-anexo { flex:1; min-width:180px; textAlign:center; border:1px solid #cbd5e1; padding:15px; borderRadius:12px; textDecoration:none; color:#0f172a; fontSize:11px; fontWeight:900; display:flex; alignItems:center; justifyContent:center; gap:8px; background:#fff; transition:0.2s; }
        .btn-anexo:hover { background:#f1f5f9; transform:translateY(-2px); }
        
        .tooltip-container { position: relative; display: flex; align-items: center; }
        .tooltip-box {
          visibility: hidden;
          background-color: #000;
          color: #fff;
          text-align: center;
          padding: 10px 15px;
          border-radius: 8px;
          position: absolute;
          z-index: 5000;
          bottom: 125%;
          right: 0;
          width: 250px;
          font-size: 15px; /* FONTE TAMANHO 15 */
          font-weight: 600;
          opacity: 0;
          transition: opacity 0.3s;
          box-shadow: 0 10px 20px rgba(0,0,0,0.2);
          pointer-events: none;
        }
        .tooltip-container:hover .tooltip-box {
          visibility: visible;
          opacity: 1;
        }
        /* SETINHA DO TOOLTIP */
        .tooltip-box::after {
          content: "";
          position: absolute;
          top: 100%;
          right: 15px;
          border-width: 8px;
          border-style: solid;
          border-color: #000 transparent transparent transparent;
        }
      `}</style>
    </div>
  )
}