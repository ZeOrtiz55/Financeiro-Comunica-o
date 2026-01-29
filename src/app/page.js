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
    if (!novaMsg.trim() || !userProfile?.id) return
    const texto = novaMsg; setNovaMsg('')
    setMensagens(prev => [...prev, { id: Date.now(), texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id }])
    await supabase.from('mensagens_chat').insert([{ texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id, chamado_id: chamadoId }])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '1px solid #eee', paddingLeft: '20px' }}>
      <h4 style={{ fontSize: '11px', color: '#22c55e', marginBottom: '10px', fontWeight:'900' }}>CONVERSA DO CHAMADO #{chamadoId}</h4>
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
        <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Mensagem..." style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '12px', outline: 'none' }} />
        <button style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '10px', padding: '10px', cursor:'pointer' }}>➔</button>
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

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [mensagens, isOpen])

  const enviar = async (e) => {
    e.preventDefault(); if (!novaMsg.trim()) return
    const t = novaMsg; setNovaMsg('')
    setMensagens(prev => [...prev, { id: Date.now(), texto: t, usuario_nome: userProfile.nome, usuario_id: userProfile.id }])
    await supabase.from('mensagens_chat').insert([{ texto: t, usuario_nome: userProfile.nome, usuario_id: userProfile.id }])
  }

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 3000, display:'flex', alignItems:'center', gap:'10px' }}>
      {!isOpen && <span style={{ background:'rgba(0,0,0,0.7)', color:'white', padding:'6px 15px', borderRadius:'20px', fontSize:'11px', fontWeight:'bold', backdropFilter:'blur(5px)' }}>CHAT GERAL</span>}
      <div style={{ position: 'relative' }}>
        <button onClick={() => {setIsOpen(!isOpen); setUnreadGeral(0)}} style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#166534', color: '#fff', border: 'none', fontSize: '24px', cursor: 'pointer', boxShadow: '0 5px 15px rgba(0,0,0,0.2)' }}>
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
           <form onSubmit={enviar} style={{ padding: '10px', display: 'flex', gap: '5px', borderTop:'1px solid #eee' }}><input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Dúvida geral..." style={{flex:1, padding:'10px', borderRadius:'10px', border:'1px solid #ddd', fontSize:'12px', outline:'none'}} /><button style={{background:'#166534', color:'#fff', border:'none', borderRadius:'10px', padding:'0 15px'}}>➔</button></form>
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

  const carregarDadosIniciais = async () => {
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

    // Listener de Mensagens Corrigido
    supabase.channel('notificacoes_master').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat' }, 
      async payload => {
        if (String(payload.new.usuario_id) === String(session.user.id)) return 

        new Audio('/notificacao.mp3').play().catch(() => {})

        if (payload.new.chamado_id) {
          // Busca o nome do cliente direto no banco se não tiver na lista local
          const { data: cardInfo } = await supabase.from('Chamado_NF').select('nom_cliente').eq('id', payload.new.chamado_id).single()
          
          setNotificacoesCards(prev => [{ 
            id: payload.new.id, 
            remetente: payload.new.usuario_nome, 
            chamadoId: payload.new.chamado_id,
            cliente: cardInfo ? cardInfo.nom_cliente : "Processo"
          }, ...prev])
        } else {
          setUnreadGeral(prev => prev + 1)
        }
      }
    ).subscribe()
  }

  useEffect(() => { carregarDadosIniciais() }, [router])

  const glassStyle = { background: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(15px)', border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: '30px' }

  if (loading) return <div style={{padding:'100px', textAlign:'center', fontWeight:'bold'}}>Carregando...</div>

  return (
    <div style={{ padding: '30px 20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      <style>{`
        @keyframes shake { 0% { transform: rotate(0); } 20% { transform: rotate(15deg); } 40% { transform: rotate(-15deg); } 60% { transform: rotate(10deg); } 100% { transform: rotate(0); } }
        .bell-shake { animation: shake 0.5s ease-in-out infinite; }
      `}</style>

      <header style={{ ...glassStyle, padding: '15px 25px', display: 'flex', justifyContent: 'space-between', marginBottom: '40px', alignItems:'center', boxShadow:'0 8px 32px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
           <div style={{ width:'40px', height:'40px', background:'#22c55e', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:'bold' }}>{userProfile?.nome?.charAt(0)}</div>
           <div><b style={{fontSize:'14px'}}>{userProfile?.nome}</b><p style={{margin:0, fontSize:'10px', color:'#166534', fontWeight:'bold'}}>{userProfile?.funcao?.toUpperCase()}</p></div>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', alignItems:'center', position: 'relative' }}>
          
          <div onClick={() => setShowNotiPanel(!showNotiPanel)} style={{ position: 'relative', fontSize: '22px', cursor: 'pointer', background: '#f8fafc', padding: '8px', borderRadius: '12px' }} className={notificacoesCards.length > 0 ? 'bell-shake' : ''}>
            🔔
            {notificacoesCards.length > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', fontSize: '10px', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', fontWeight:'bold' }}>{notificacoesCards.length}</span>}
          </div>

          {showNotiPanel && (
            <div style={{ position: 'absolute', top: '55px', right: 0, width: '320px', background: 'white', borderRadius: '20px', boxShadow: '0 15px 40px rgba(0,0,0,0.15)', zIndex: 4000, border: '1px solid #eee', overflow: 'hidden' }}>
              <div style={{ padding: '15px', background:'#f8fafc', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ fontSize: '13px' }}>🔔 Mensagens nos Cards</b>
                <button onClick={() => {setNotificacoesCards([]); setShowNotiPanel(false)}} style={{ background:'none', border:'none', color:'#22c55e', fontSize:'11px', fontWeight:'bold', cursor:'pointer' }}>Limpar</button>
              </div>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {notificacoesCards.length > 0 ? notificacoesCards.map(n => (
                  <div key={n.id} style={{ padding: '15px', borderBottom: '1px solid #f9f9f9', background: '#fff' }} onClick={() => setShowNotiPanel(false)}>
                    <p style={{ margin: 0, fontSize: '12px', lineHeight:'1.4' }}>
                      <b>{n.remetente}</b> mandou mensagem no processo:<br/>
                      <span style={{color:'#166534', fontWeight:'bold'}}>#{n.chamadoId} - {n.cliente}</span>
                    </p>
                  </div>
                )) : <p style={{ padding: '30px', textAlign: 'center', fontSize: '12px', color: '#999' }}>Nenhuma novidade nos cards.</p>}
              </div>
            </div>
          )}

          <button onClick={() => router.push('/kanban')} style={{ background: '#000', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '12px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>KANBAN</button>
          <button onClick={() => setIsSelecaoOpen(true)} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>+ NOVO</button>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#14532d', marginBottom: '10px' }}>Sua Fila</h2>
        {tarefas.map(t => (
          <div key={t.id} onClick={() => setTarefaSelecionada(t)} style={{ ...glassStyle, padding: '20px 25px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: '0.2s', border: '1px solid transparent' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <b style={{ fontSize: '14px', color: '#166534' }}>#{t.id}</b>
                <span style={{ fontSize: '9px', fontWeight: '900', color: '#166534', background: 'rgba(34,197,94,0.1)', padding: '3px 7px', borderRadius: '5px' }}>{t.tarefa?.toUpperCase()}</span>
              </div>
              <h3 style={{ margin: '5px 0 0 0', fontWeight: '800', fontSize: '16px' }}>{t.nom_cliente}</h3>
            </div>
            <b style={{ color: '#166534', fontSize:'18px' }}>R$ {t.valor_servico}</b>
          </div>
        ))}
      </div>

      {tarefaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '950px', borderRadius: '40px', display: 'grid', gridTemplateColumns: '1fr 380px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '40px', overflowY: 'auto', maxHeight: '85vh' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                 <b style={{ fontSize: '18px', color: '#166534' }}>#{tarefaSelecionada.id}</b>
                 <h2 style={{ color: '#14532d', margin: 0 }}>{tarefaSelecionada.nom_cliente}</h2>
              </div>
              <button onClick={() => setTarefaSelecionada(null)} style={{ background: '#000', color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: 'bold', cursor:'pointer', marginTop: '30px', width:'100%' }}>FECHAR</button>
            </div>
            <div style={{ padding: '30px', background: '#f8fafc' }}>
              {userProfile && <ChatChamado chamadoId={tarefaSelecionada.id} userProfile={userProfile} />}
            </div>
          </div>
        </div>
      )}

      {isSelecaoOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '45px', width: '90%', maxWidth: '400px', textAlign:'center' }}>
            <h3 style={{fontWeight:'900', marginBottom:'20px'}}>Novo Chamado</h3>
            <button onClick={() => router.push('/novo-chamado-nf')} style={{ width: '100%', background: '#22c55e', color: 'white', padding: '20px', borderRadius: '15px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>📑 NOTA FISCAL</button>
            <button onClick={() => setIsSelecaoOpen(false)} style={{ background: 'none', border: 'none', color: '#999', marginTop:'15px', cursor: 'pointer' }}>CANCELAR</button>
          </div>
        </div>
      )}

      {userProfile && <ChatFlutuante userProfile={userProfile} unreadGeral={unreadGeral} setUnreadGeral={setUnreadGeral} />}
    </div>
  )
}