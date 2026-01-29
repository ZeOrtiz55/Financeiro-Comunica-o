'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// --- 1. CHAT ESPECÍFICO DO CARD ---
function ChatChamado({ chamadoId, userProfile }) {
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()

  useEffect(() => {
    if (!chamadoId || !userProfile?.id) return
    supabase.from('mensagens_chat').select('*').eq('chamado_id', chamadoId).order('created_at', { ascending: true }).then(({ data }) => data && setMensagens(data))
    const channel = supabase.channel(`chat_card_${chamadoId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat', filter: `chamado_id=eq.${chamadoId}` }, 
      p => { if (String(p.new.usuario_id) !== String(userProfile.id)) setMensagens(prev => [...prev, p.new]) }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [chamadoId, userProfile?.id])

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [mensagens])

  const enviar = async (e) => {
    e.preventDefault(); if (!novaMsg.trim()) return
    const t = novaMsg; setNovaMsg('')
    setMensagens(prev => [...prev, { id: Date.now(), texto: t, usuario_nome: userProfile.nome, usuario_id: userProfile.id }])
    await supabase.from('mensagens_chat').insert([{ texto: t, usuario_nome: userProfile.nome, usuario_id: userProfile.id, chamado_id: chamadoId }])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '1px solid #eee', paddingLeft: '20px' }}>
      <h4 style={{ fontSize: '11px', color: '#22c55e', marginBottom: '10px', fontWeight:'900' }}>CONVERSA DO PROCESSO</h4>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: '#f8fafc', borderRadius: '15px' }}>
        {mensagens.map(m => (
          <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile?.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile?.id) ? '#22c55e' : 'white', color: String(m.usuario_id) === String(userProfile?.id) ? 'white' : 'black', padding: '10px', borderRadius: '12px', fontSize: '11px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <b style={{ fontSize: '8px', display: 'block', opacity: 0.7 }}>{m.usuario_nome}</b>{m.texto}
          </div>
        ))}
      </div>
      <form onSubmit={enviar} style={{ display: 'flex', gap: '5px', paddingTop: '15px' }}>
        <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Tirar dúvida..." style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '12px', outline: 'none' }} />
        <button style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '10px', padding: '10px' }}>➔</button>
      </form>
    </div>
  )
}

// --- 2. CHAT FLUTUANTE (GERAL) ---
function ChatFlutuante({ userProfile, unreadGeral, setUnreadGeral }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()

  useEffect(() => {
    if (!userProfile?.id) return
    supabase.from('mensagens_chat').select('*').is('chamado_id', null).order('created_at', { ascending: true }).limit(50).then(({ data }) => data && setMensagens(data))
    const channel = supabase.channel('chat_geral_refresh').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat' }, 
      p => { if (!p.new.chamado_id && String(p.new.usuario_id) !== String(userProfile.id)) setMensagens(prev => [...prev, p.new]) }
    ).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userProfile?.id])

  const enviar = async (e) => {
    e.preventDefault(); if (!novaMsg.trim()) return
    const t = novaMsg; setNovaMsg('')
    setMensagens(prev => [...prev, { id: Date.now(), texto: t, usuario_nome: userProfile.nome, usuario_id: userProfile.id }])
    await supabase.from('mensagens_chat').insert([{ texto: t, usuario_nome: userProfile.nome, usuario_id: userProfile.id }])
  }

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 3000, display:'flex', alignItems:'center', gap:'10px' }}>
      {!isOpen && <span style={{ background:'rgba(0,0,0,0.8)', color:'white', padding:'6px 15px', borderRadius:'20px', fontSize:'11px', fontWeight:'bold' }}>CHAT GERAL</span>}
      <div style={{ position: 'relative' }}>
        <button onClick={() => {setIsOpen(!isOpen); setUnreadGeral(0)}} style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#166534', color: '#fff', border: 'none', fontSize: '24px', cursor: 'pointer', boxShadow: '0 5px 15px rgba(0,0,0,0.2)' }}>
          {isOpen ? '✕' : '💬'}
        </button>
        {!isOpen && unreadGeral > 0 && <div style={{ position:'absolute', top:0, right:0, background:'red', width:'20px', height:'20px', borderRadius:'50%', fontSize:'10px', display:'flex', alignItems:'center', justifyContent:'center', color:'white', border:'2px solid white', fontWeight:'bold' }}>{unreadGeral}</div>}
      </div>
      {isOpen && (
        <div style={{ position: 'absolute', bottom: '80px', right: 0, width: '300px', height: '400px', background: '#fff', borderRadius: '25px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', border:'1px solid #eee', overflow:'hidden' }}>
           <div style={{ padding: '15px', background: '#166534', color: '#fff', fontWeight: 'bold' }}>Chat Geral</div>
           <div ref={scrollRef} style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {mensagens.map(m => ( <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile.id) ? '#22c55e' : '#eee', color: String(m.usuario_id) === String(userProfile.id) ? '#fff' : '#000', padding: '8px', borderRadius: '10px', fontSize: '11px' }}><b style={{fontSize:'8px', display:'block'}}>{m.usuario_nome}</b>{m.texto}</div> ))}
           </div>
           <form onSubmit={enviar} style={{ padding: '10px', display: 'flex', gap: '5px', borderTop:'1px solid #eee' }}><input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="..." style={{flex:1, padding:'10px', borderRadius:'10px', border:'1px solid #ddd', fontSize:'12px'}} /><button style={{background:'#166534', color:'#fff', border:'none', borderRadius:'10px', padding:'0 15px'}}>➔</button></form>
        </div>
      )}
    </div>
  )
}

// --- PÁGINA HOME ---
export default function Home() {
  const [tarefas, setTarefas] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [unreadGeral, setUnreadGeral] = useState(0)
  const [notificacoesCards, setNotificacoesCards] = useState([]) 
  const [showNotiPanel, setShowNotiPanel] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const carregar = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/login')
      const { data: prof } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single()
      setUserProfile(prof)
      const { data: chs } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido').order('id', {ascending: false})
      
      const filtradas = (chs || []).filter(t => {
        if (prof?.funcao === 'Financeiro') return t.status === 'gerar_boleto' || t.status === 'validar_pix'
        if (prof?.funcao === 'Pós-Vendas') return t.status === 'enviar_cliente' || t.status === 'vencido'
        return false
      })
      setTarefas(filtradas)
      setLoading(false)

      const channel = supabase.channel('master_notif').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat' }, 
        async payload => {
          if (String(payload.new.usuario_id) === String(session.user.id)) return 
          new Audio('/notificacao.mp3.mp3').play().catch(() => {})
          if (payload.new.chamado_id) {
            const { data: cardInfo } = await supabase.from('Chamado_NF').select('nom_cliente').eq('id', payload.new.chamado_id).single()
            setNotificacoesCards(prev => [{ id: payload.new.id, remetente: payload.new.usuario_nome, chamadoId: payload.new.chamado_id, cliente: cardInfo?.nom_cliente || "Processo" }, ...prev])
          } else { setUnreadGeral(prev => prev + 1) }
        }
      ).subscribe()
      return () => { supabase.removeChannel(channel) }
    }
    carregar()
  }, [router])

  const handleAction = async (statusFinal) => {
    await supabase.from('Chamado_NF').update({ status: statusFinal, tarefa: 'Concluído' }).eq('id', tarefaSelecionada?.id)
    window.location.reload()
  }

  if (loading) return <div style={{padding:'100px', textAlign:'center', fontWeight:'bold'}}>Carregando sistema...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'sans-serif' }}>
      <style>{`
        @keyframes shake { 0% { transform: rotate(0); } 20% { transform: rotate(15deg); } 40% { transform: rotate(-15deg); } 60% { transform: rotate(10deg); } 100% { transform: rotate(0); } }
        .bell-shake { animation: shake 0.5s ease-in-out infinite; }
      `}</style>

      {/* SIDEBAR REPRODUZÍVEL EM TODAS AS TELAS */}
      <aside onMouseEnter={()=>setIsSidebarOpen(true)} onMouseLeave={()=>setIsSidebarOpen(false)} style={{ width: isSidebarOpen ? '260px' : '60px', background: '#fff', height: '100vh', position: 'fixed', left: 0, top: 0, borderRight: '1px solid #eee', padding: '30px 10px', display: 'flex', flexDirection: 'column', transition:'0.3s', zIndex:1000, overflow:'hidden', boxShadow:'4px 0 10px rgba(0,0,0,0.02)' }}>
        <div style={{ opacity: isSidebarOpen ? 1 : 0, transition:'0.2s', whiteSpace:'nowrap' }}>
            <b style={{display:'block', marginBottom:'40px', textAlign:'center', color:'#22c55e'}}>NOVA TRATORES</b>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button onClick={() => router.push('/')} style={{ background:'#f0fdf4', color:'#166534', border:'none', padding:'15px', borderRadius:'12px', textAlign:'left', fontWeight:'bold', cursor:'pointer' }}>🏠 Minhas Tarefas</button>
                <button onClick={() => router.push('/kanban')} style={{ background:'none', color:'#666', border:'none', padding:'15px', borderRadius:'12px', textAlign:'left', fontWeight:'bold', cursor:'pointer' }}>📊 Controle Boletos</button>
                <button onClick={() => router.push('/novo-chamado-nf')} style={{ background:'none', color:'#666', border:'none', padding:'15px', borderRadius:'12px', textAlign:'left', fontWeight:'bold', cursor:'pointer' }}>➕ Novo Faturamento</button>
            </nav>
        </div>
        {!isSidebarOpen && <div style={{textAlign:'center', fontSize:'20px', marginTop:'20px'}}>☰</div>}
      </aside>

      <main style={{ marginLeft: '80px', flex: 1, padding: '40px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#14532d' }}>Minhas Tarefas</h2>
            <div onClick={() => setShowNotiPanel(!showNotiPanel)} style={{ position:'relative', fontSize: '24px', cursor: 'pointer', background: '#fff', padding: '10px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }} className={notificacoesCards.length > 0 ? 'bell-shake' : ''}>
                🔔{notificacoesCards.length > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', fontSize: '10px', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight:'bold' }}>{notificacoesCards.length}</span>}
                {showNotiPanel && (
                    <div style={{ position: 'absolute', top: '55px', right: 0, width: '300px', background: 'white', borderRadius: '20px', boxShadow: '0 15px 40px rgba(0,0,0,0.15)', zIndex: 4000, border: '1px solid #eee', overflow: 'hidden' }}>
                        <div style={{ padding: '15px', background:'#f8fafc', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <b style={{ fontSize: '13px', color:'#000' }}>Notificações</b>
                            <button onClick={() => setNotificacoesCards([])} style={{ background:'none', border:'none', color:'#22c55e', fontSize:'11px', fontWeight:'bold', cursor:'pointer' }}>Limpar</button>
                        </div>
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {notificacoesCards.length > 0 ? notificacoesCards.map(n => (
                                <div key={n.id} style={{ padding: '15px', borderBottom: '1px solid #f9f9f9' }}>
                                    <p style={{ margin: 0, fontSize: '12px', color:'#333' }}><b>{n.remetente}</b> mandou mensagem em: <b style={{color:'#166534'}}>#{n.chamadoId} - {n.cliente}</b></p>
                                </div>
                            )) : <p style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: '#999' }}>Tudo lido!</p>}
                        </div>
                    </div>
                )}
            </div>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {tarefas.map(t => (
            <div key={t.id} onClick={() => setTarefaSelecionada(t)} style={{ background: '#fff', padding: '25px', borderRadius: '25px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow:'0 5px 15px rgba(0,0,0,0.03)', border: '1px solid transparent' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom:'5px' }}>
                  <b style={{ color: '#166534', background:'#f0fdf4', padding:'2px 8px', borderRadius:'6px', fontSize:'13px' }}>#{t.id}</b>
                  <span style={{ fontSize: '9px', fontWeight: '900', color: '#666', background: '#f1f5f9', padding: '3px 7px', borderRadius: '5px' }}>{t.tarefa?.toUpperCase()}</span>
                </div>
                <h3 style={{ margin: 0, fontWeight: '800', fontSize: '18px' }}>{t.nom_cliente}</h3>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '8px', display:'flex', gap:'15px' }}>
                    <span>NF Serviço: <b>{t.num_nf_servico || '-'}</b></span>
                    <span>NF Peças: <b>{t.num_nf_peca || '-'}</b></span>
                    <span>Pagto: <b>{t.forma_pagamento}</b></span>
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                 <b style={{ color: '#166534', fontSize:'22px' }}>R$ {t.valor_servico}</b>
                 <div style={{fontSize:'10px', color:'#999', marginTop:'5px'}}>Ver e Conversar ⮕</div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* MODAL SPLIT DETALHES + CHAT */}
      {tarefaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '1050px', borderRadius: '45px', display: 'grid', gridTemplateColumns: '1fr 380px', overflow: 'hidden', boxShadow: '0 30px 70px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '45px', overflowY: 'auto', maxHeight: '85vh' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                 <b style={{ fontSize: '20px', color: '#166534', background: '#f0fdf4', padding: '5px 15px', borderRadius: '12px' }}>#{tarefaSelecionada.id}</b>
                 <h2 style={{ color: '#14532d', margin: 0, fontSize:'28px' }}>{tarefaSelecionada.nom_cliente}</h2>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background:'#f8fafc', padding:'25px', borderRadius:'25px' }}>
                 <div><label style={{fontSize:'10px', color:'#999', fontWeight:'bold', display:'block'}}>VALOR TOTAL</label><b>R$ {tarefaSelecionada.valor_servico}</b></div>
                 <div><label style={{fontSize:'10px', color:'#999', fontWeight:'bold', display:'block'}}>PAGAMENTO</label><b>{tarefaSelecionada.forma_pagamento}</b></div>
                 <div><label style={{fontSize:'10px', color:'#999', fontWeight:'bold', display:'block'}}>NOTA DE SERVIÇO</label><b>{tarefaSelecionada.num_nf_servico || '---'}</b></div>
                 <div><label style={{fontSize:'10px', color:'#999', fontWeight:'bold', display:'block'}}>NOTA DE PEÇAS</label><b>{tarefaSelecionada.num_nf_peca || '---'}</b></div>
                 <div><label style={{fontSize:'10px', color:'#999', fontWeight:'bold', display:'block'}}>QTD PARCELAS</label><b>{tarefaSelecionada.qtd_parcelas || 1}x</b></div>
                 <div><label style={{fontSize:'10px', color:'#999', fontWeight:'bold', display:'block'}}>SETOR ORIGEM</label><b>{tarefaSelecionada.setor}</b></div>
              </div>

              {tarefaSelecionada.obs && (
                <div style={{ marginTop: '20px', background:'#fffbeb', padding:'20px', borderRadius:'20px', border:'1px solid #fef3c7' }}>
                   <label style={{fontSize:'10px', color:'#d97706', fontWeight:'bold', display:'block'}}>OBSERVAÇÕES:</label>
                   <p style={{margin:0, fontSize:'13px', lineHeight:'1.5'}}>{tarefaSelecionada.obs}</p>
                </div>
              )}

              <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                 {tarefaSelecionada.status === 'validar_pix' && userProfile?.funcao === 'Financeiro' && (
                    <div style={{ background: '#f0fdf4', padding: '25px', borderRadius: '25px', border:'2px solid #22c55e', textAlign:'center' }}>
                       <b style={{color:'#166534', display:'block', marginBottom:'15px'}}>PAGAMENTO VIA PIX</b>
                       <a href={tarefaSelecionada.comprovante_pagamento} target="_blank" style={{ display:'block', background:'#22c55e', color:'#fff', padding:'15px', borderRadius:'12px', textDecoration:'none', fontWeight:'bold', marginBottom:'15px' }}>👁 VER COMPROVANTE ANEXADO</a>
                       <button onClick={() => handleAction('pago')} style={{ width:'100%', background:'#000', color:'#fff', padding:'18px', borderRadius:'12px', fontWeight:'bold', border:'none', cursor:'pointer' }}>CONFERIDO: MARCAR COMO PAGO ✅</button>
                    </div>
                 )}
                 <div style={{display:'flex', gap:'10px'}}>
                    {tarefaSelecionada.anexo_nf_servico && <a href={tarefaSelecionada.anexo_nf_servico} target="_blank" style={{flex:1, background:'#f1f5f9', padding:'12px', borderRadius:'10px', textDecoration:'none', textAlign:'center', color:'#475569', fontSize:'11px', fontWeight:'bold'}}>📄 NOTA SERVIÇO</a>}
                    {tarefaSelecionada.anexo_nf_peca && <a href={tarefaSelecionada.anexo_nf_peca} target="_blank" style={{flex:1, background:'#f1f5f9', padding:'12px', borderRadius:'10px', textDecoration:'none', textAlign:'center', color:'#475569', fontSize:'11px', fontWeight:'bold'}}>⚙️ NOTA PEÇAS</a>}
                 </div>
                 <button onClick={() => setTarefaSelecionada(null)} style={{ background: '#eee', color: '#666', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: 'bold', cursor:'pointer' }}>FECHAR PAINEL</button>
              </div>
            </div>
            <div style={{ padding: '30px', background: '#f8fafc' }}>
              {userProfile && <ChatChamado chamadoId={tarefaSelecionada.id} userProfile={userProfile} />}
            </div>
          </div>
        </div>
      )}

      {userProfile && <ChatFlutuante userProfile={userProfile} unreadGeral={unreadGeral} setUnreadGeral={setUnreadGeral} />}
    </div>
  )
}