'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// --- 1. CHAT ESPECÍFICO DO CARD (LADO DIREITO) ---
function ChatChamado({ chamadoId, userProfile }) {
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()

  useEffect(() => {
    if (!chamadoId || !userProfile?.id) return
    supabase.from('mensagens_chat').select('*').eq('chamado_id', chamadoId).order('created_at', { ascending: true })
      .then(({ data }) => data && setMensagens(data))

    const channel = supabase.channel(`chat_card_${chamadoId}`).on('postgres_changes', { 
      event: 'INSERT', schema: 'public', table: 'mensagens_chat', filter: `chamado_id=eq.${chamadoId}` 
    }, payload => { 
      if (String(payload.new.usuario_id) !== String(userProfile.id)) setMensagens(prev => [...prev, payload.new]) 
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [chamadoId, userProfile?.id])

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [mensagens])

  const enviar = async (e) => {
    e.preventDefault()
    if (!novaMsg.trim()) return
    const texto = novaMsg; setNovaMsg('')
    setMensagens(prev => [...prev, { id: Date.now(), texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id }])
    await supabase.from('mensagens_chat').insert([{ texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id, chamado_id: chamadoId }])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '1px solid #eee', paddingLeft: '20px' }}>
      <h4 style={{ fontSize: '11px', color: '#22c55e', marginBottom: '10px', fontWeight:'900', letterSpacing:'1px' }}>CONVERSA DO CHAMADO</h4>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: '#f8fafc', borderRadius: '15px' }}>
        {mensagens.map(m => {
          const souEu = String(m.usuario_id) === String(userProfile?.id)
          return (
            <div key={m.id} style={{ alignSelf: souEu ? 'flex-end' : 'flex-start', background: souEu ? '#22c55e' : 'white', color: souEu ? 'white' : 'black', padding: '10px', borderRadius: '12px', fontSize: '11px', maxWidth: '85%', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <b style={{ fontSize: '8px', display: 'block', opacity: 0.7 }}>{m.usuario_nome}</b>{m.texto}
            </div>
          )
        })}
      </div>
      <form onSubmit={enviar} style={{ display: 'flex', gap: '5px', paddingTop: '15px' }}>
        <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Tirar dúvida..." style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '12px', outline: 'none' }} />
        <button style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '12px', width: '45px', cursor: 'pointer' }}>➔</button>
      </form>
    </div>
  )
}

// --- 2. CHAT FLUTUANTE (GERAL) ---
function ChatFlutuante({ userProfile, unreadGeral, resetUnread }) {
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

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [mensagens, isOpen])

  const enviar = async (e) => {
    e.preventDefault(); if (!novaMsg.trim()) return
    const t = novaMsg; setNovaMsg('')
    setMensagens(prev => [...prev, { id: Date.now(), texto: t, usuario_nome: userProfile.nome, usuario_id: userProfile.id }])
    await supabase.from('mensagens_chat').insert([{ texto: t, usuario_nome: userProfile.nome, usuario_id: userProfile.id }])
  }

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 3000, display:'flex', alignItems:'center', gap:'10px' }}>
      {!isOpen && <span style={{ background:'rgba(0,0,0,0.8)', color:'white', padding:'6px 15px', borderRadius:'20px', fontSize:'10px', fontWeight:'900' }}>CHAT GERAL</span>}
      <div style={{ position: 'relative' }}>
        <button onClick={() => {setIsOpen(!isOpen); resetUnread()}} style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#166534', color: '#fff', border: 'none', fontSize: '24px', cursor: 'pointer', boxShadow: '0 5px 15px rgba(0,0,0,0.2)' }}>
          {isOpen ? '✕' : '💬'}
        </button>
        {!isOpen && unreadGeral > 0 && (
          <div style={{ position:'absolute', top:0, right:0, background:'red', width:'22px', height:'22px', borderRadius:'50%', fontSize:'11px', display:'flex', alignItems:'center', justifyContent:'center', color:'white', border:'2px solid white', fontWeight:'bold' }}>{unreadGeral}</div>
        )}
      </div>
      {isOpen && (
        <div style={{ position: 'absolute', bottom: '80px', right: 0, width: '320px', height: '450px', background: '#fff', borderRadius: '25px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', overflow: 'hidden', border:'1px solid #eee' }}>
           <div style={{ padding: '15px', background: '#166534', color: '#fff', fontWeight: 'bold' }}>Chat Geral Nova Tratores</div>
           <div ref={scrollRef} style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {mensagens.map(m => ( <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile.id) ? '#22c55e' : '#eee', color: String(m.usuario_id) === String(userProfile.id) ? '#fff' : '#000', padding: '10px', borderRadius: '15px', fontSize: '12px' }}><b style={{fontSize:'8px', display:'block'}}>{m.usuario_nome}</b>{m.texto}</div> ))}
           </div>
           <form onSubmit={enviar} style={{ padding: '10px', display: 'flex', gap: '5px', borderTop:'1px solid #eee' }}><input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Escreva aqui..." style={{flex:1, padding:'10px', borderRadius:'10px', border:'1px solid #ddd', fontSize:'12px', outline:'none'}} /><button style={{background:'#166534', color:'#fff', border:'none', borderRadius:'10px', padding:'0 15px'}}>➔</button></form>
        </div>
      )}
    </div>
  )
}

// --- 3. PÁGINA PRINCIPAL ---
export default function Home() {
  const [tarefas, setTarefas] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null)
  const [isSelecaoOpen, setIsSelecaoOpen] = useState(false)
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
        if (prof?.funcao === 'Financeiro') return t.status === 'gerar_boleto'
        if (prof?.funcao === 'Pós-Vendas') return t.status === 'enviar_cliente' || t.status === 'vencido'
        return false
      })
      setTarefas(filtradas)
      setLoading(false)

      const channel = supabase.channel('master_notif').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat' }, 
        async payload => {
          if (String(payload.new.usuario_id) === String(session.user.id)) return 
          new Audio('/notificacao.mp3').play().catch(() => {})

          if (payload.new.chamado_id) {
            const { data: cardInfo } = await supabase.from('Chamado_NF').select('nom_cliente').eq('id', payload.new.chamado_id).single()
            setNotificacoesCards(prev => [{ id: payload.new.id, remetente: payload.new.usuario_nome, chamadoId: payload.new.chamado_id, cliente: cardInfo?.nom_cliente || "Processo" }, ...prev])
          } else {
            setUnreadGeral(prev => prev + 1)
          }
        }
      ).subscribe()
      return () => { supabase.removeChannel(channel) }
    }
    carregar()
  }, [router])

  const glassStyle = { background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: '30px' }

  return (
    <div style={{ padding: '30px 20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      <style>{`
        @keyframes shake { 0% { transform: rotate(0); } 20% { transform: rotate(15deg); } 40% { transform: rotate(-15deg); } 60% { transform: rotate(10deg); } 100% { transform: rotate(0); } }
        .bell-shake { animation: shake 0.5s ease-in-out infinite; }
      `}</style>

      {/* HEADER */}
      <header style={{ ...glassStyle, padding: '15px 25px', display: 'flex', justifyContent: 'space-between', marginBottom: '40px', alignItems:'center', boxShadow:'0 10px 40px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
           <div style={{ width:'45px', height:'45px', background:'#22c55e', borderRadius:'15px', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:'bold', fontSize:'18px' }}>{userProfile?.nome?.charAt(0)}</div>
           <div><b style={{fontSize:'15px'}}>{userProfile?.nome}</b><p style={{margin:0, fontSize:'10px', color:'#166534', fontWeight:'bold', letterSpacing:'1px'}}>{userProfile?.funcao?.toUpperCase()}</p></div>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', alignItems:'center', position: 'relative' }}>
          <div onClick={() => setShowNotiPanel(!showNotiPanel)} style={{ position: 'relative', fontSize: '24px', cursor: 'pointer', background: '#f8fafc', padding: '10px', borderRadius: '15px' }} className={notificacoesCards.length > 0 ? 'bell-shake' : ''}>
            🔔{notificacoesCards.length > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', fontSize: '10px', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', fontWeight:'bold' }}>{notificacoesCards.length}</span>}
          </div>

          {showNotiPanel && (
            <div style={{ position: 'absolute', top: '65px', right: 0, width: '320px', background: 'white', borderRadius: '25px', boxShadow: '0 15px 50px rgba(0,0,0,0.2)', zIndex: 4000, border: '1px solid #eee', overflow: 'hidden' }}>
              <div style={{ padding: '18px', background:'#f8fafc', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ fontSize: '13px' }}>Notificações de Cards</b>
                <button onClick={() => {setNotificacoesCards([]); setShowNotiPanel(false)}} style={{ background:'none', border:'none', color:'#22c55e', fontSize:'11px', fontWeight:'bold', cursor:'pointer' }}>Limpar</button>
              </div>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {notificacoesCards.length > 0 ? notificacoesCards.map(n => (
                  <div key={n.id} style={{ padding: '15px', borderBottom: '1px solid #f9f9f9', background: '#fff' }} onClick={() => setShowNotiPanel(false)}>
                    <p style={{ margin: 0, fontSize: '12px', lineHeight:'1.5' }}>
                      <b>{n.remetente}</b> comentou no card:<br/>
                      <span style={{color:'#166534', fontWeight:'900'}}>#{n.chamadoId} - {n.cliente}</span>
                    </p>
                  </div>
                )) : <p style={{ padding: '30px', textAlign: 'center', fontSize: '12px', color: '#999' }}>Tudo lido! ✅</p>}
              </div>
            </div>
          )}

          <button onClick={() => router.push('/kanban')} style={{ background: '#000', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '15px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>KANBAN</button>
          <button onClick={() => setIsSelecaoOpen(true)} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' }}>+ NOVO</button>
        </div>
      </header>

      {/* FILA DE TAREFAS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#14532d', marginBottom: '10px' }}>Minha Fila</h2>
        {tarefas.map(t => (
          <div key={t.id} onClick={() => setTarefaSelecionada(t)} style={{ ...glassStyle, padding: '25px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: '0.3s', border: '1px solid transparent', boxShadow:'0 4px 15px rgba(0,0,0,0.02)' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#22c55e'}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom:'5px' }}>
                <b style={{ fontSize: '14px', color: '#166534', background:'#f0fdf4', padding:'2px 8px', borderRadius:'6px' }}>#{t.id}</b>
                <span style={{ fontSize: '10px', fontWeight: '900', color: '#666', background: '#eee', padding: '3px 8px', borderRadius: '6px' }}>{t.tarefa?.toUpperCase()}</span>
              </div>
              <h3 style={{ margin: 0, fontWeight: '800', fontSize: '18px' }}>{t.nom_cliente}</h3>
            </div>
            <div style={{textAlign:'right'}}>
               <b style={{ color: '#166534', fontSize:'20px', display:'block' }}>R$ {t.valor_servico}</b>
               <span style={{fontSize:'10px', color:'#999'}}>Clique para ver tudo</span>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DETALHE COMPLETO + CHAT */}
      {tarefaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '1000px', borderRadius: '45px', display: 'grid', gridTemplateColumns: '1fr 380px', overflow: 'hidden', boxShadow: '0 30px 70px rgba(0,0,0,0.3)' }}>
            
            {/* LADO ESQUERDO: TODAS AS INFORMAÇÕES */}
            <div style={{ padding: '45px', overflowY: 'auto', maxHeight: '85vh' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                 <b style={{ fontSize: '20px', color: '#166534', background: '#f0fdf4', padding: '5px 15px', borderRadius: '12px' }}>#{tarefaSelecionada.id}</b>
                 <h2 style={{ color: '#14532d', margin: 0, fontSize:'28px' }}>{tarefaSelecionada.nom_cliente}</h2>
              </div>
              <p style={{fontSize:'13px', color:'#22c55e', fontWeight:'bold', letterSpacing:'1px', marginBottom:'30px'}}>{tarefaSelecionada.tarefa?.toUpperCase()}</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background:'#f8fafc', padding:'25px', borderRadius:'25px', fontSize:'14px' }}>
                 <div><label style={{fontSize:'10px', color:'#999', fontWeight:'bold', display:'block'}}>VALOR TOTAL</label><b>R$ {tarefaSelecionada.valor_servico}</b></div>
                 <div><label style={{fontSize:'10px', color:'#999', fontWeight:'bold', display:'block'}}>PAGAMENTO</label><b>{tarefaSelecionada.forma_pagamento}</b></div>
                 <div><label style={{fontSize:'10px', color:'#999', fontWeight:'bold', display:'block'}}>NF SERVIÇO</label><b>{tarefaSelecionada.num_nf_servico || '---'}</b></div>
                 <div><label style={{fontSize:'10px', color:'#999', fontWeight:'bold', display:'block'}}>NF PEÇAS</label><b>{tarefaSelecionada.num_nf_peca || '---'}</b></div>
                 <div><label style={{fontSize:'10px', color:'#999', fontWeight:'bold', display:'block'}}>VENCIMENTO</label><b>{tarefaSelecionada.vencimento_boleto || 'Imediato'}</b></div>
                 <div><label style={{fontSize:'10px', color:'#999', fontWeight:'bold', display:'block'}}>SETOR ORIGEM</label><b>{tarefaSelecionada.setor}</b></div>
              </div>

              <div style={{ marginTop: '20px', background:'#fffbeb', padding:'20px', borderRadius:'20px', border:'1px solid #fef3c7' }}>
                <label style={{fontSize:'10px', color:'#d97706', fontWeight:'bold', display:'block'}}>OBSERVAÇÕES:</label>
                <p style={{margin:'5px 0 0 0', fontSize:'13px'}}>{tarefaSelecionada.obs || 'Nenhuma observação cadastrada.'}</p>
              </div>

              <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                 <button onClick={() => setTarefaSelecionada(null)} style={{ background: '#000', color: '#fff', border: 'none', padding: '20px', borderRadius: '20px', fontWeight: 'bold', cursor:'pointer', fontSize:'15px' }}>FECHAR PAINEL</button>
              </div>
            </div>

            {/* LADO DIREITO: CHAT */}
            <div style={{ padding: '30px', background: '#f8fafc' }}>
              {userProfile && <ChatChamado chamadoId={tarefaSelecionada.id} userProfile={userProfile} />}
            </div>
          </div>
        </div>
      )}

      {/* CHAT GERAL FLUTUANTE */}
      {userProfile && <ChatFlutuante userProfile={userProfile} unreadGeral={unreadGeral} resetUnread={() => setUnreadGeral(0)} />}
    </div>
  )
}