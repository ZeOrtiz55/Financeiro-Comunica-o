'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// --- CHAT DO CARD ---
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
      <h4 style={{ fontSize: '11px', color: '#22c55e', marginBottom: '10px', fontWeight:'900' }}>CHAT DO PROCESSO</h4>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: '#f8fafc', borderRadius: '15px' }}>
        {mensagens.map(m => (
          <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile?.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile?.id) ? '#22c55e' : 'white', color: String(m.usuario_id) === String(userProfile?.id) ? 'white' : 'black', padding: '10px', borderRadius: '12px', fontSize: '11px', maxWidth: '85%', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <b style={{ fontSize: '8px', display: 'block', opacity: 0.7 }}>{m.usuario_nome}</b>{m.texto}
          </div>
        ))}
      </div>
      <form onSubmit={enviar} style={{ display: 'flex', gap: '5px', paddingTop: '15px' }}>
        <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Tirar dúvida..." style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '12px', outline: 'none' }} />
        <button style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '10px', padding: '10px', cursor:'pointer' }}>➔</button>
      </form>
    </div>
  )
}

// --- CHAT GERAL ---
function ChatFlutuante({ userProfile }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()

  useEffect(() => {
    if (!userProfile?.id) return
    supabase.from('mensagens_chat').select('*').is('chamado_id', null).order('created_at', { ascending: true }).limit(50).then(({ data }) => data && setMensagens(data))
    const channel = supabase.channel('chat_geral').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat' }, 
      p => { if (!p.new.chamado_id && String(p.new.usuario_id) !== String(userProfile.id)) setMensagens(prev => [...prev, p.new]) }
    ).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userProfile?.id])

  const enviar = async (e) => {
    e.preventDefault(); if (!novaMsg.trim()) return
    const t = novaMsg; setNovaMsg('')
    setMensagens(p => [...p, { id: Date.now(), texto: t, usuario_nome: userProfile.nome, usuario_id: userProfile.id }])
    await supabase.from('mensagens_chat').insert([{ texto: t, usuario_nome: userProfile.nome, usuario_id: userProfile.id }])
  }

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 3000 }}>
      <button onClick={() => setIsOpen(!isOpen)} style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#166534', color: '#fff', border: 'none', fontSize: '24px', cursor: 'pointer', boxShadow: '0 5px 15px rgba(0,0,0,0.2)' }}>{isOpen ? '✕' : '💬'}</button>
      {isOpen && (
        <div style={{ position: 'absolute', bottom: '75px', right: 0, width: '300px', height: '400px', background: '#fff', borderRadius: '20px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', overflow: 'hidden', border:'1px solid #eee' }}>
           <div style={{ padding: '15px', background: '#166534', color: '#fff', fontWeight: 'bold' }}>Chat Geral</div>
           <div style={{ flex: 1, padding: '10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {mensagens.map(m => ( <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile.id) ? '#22c55e' : '#eee', color: String(m.usuario_id) === String(userProfile.id) ? '#fff' : '#000', padding: '8px', borderRadius: '10px', fontSize: '11px' }}><b style={{fontSize:'8px', display:'block'}}>{m.usuario_nome}</b>{m.texto}</div> ))}
           </div>
           <form onSubmit={enviar} style={{ padding: '10px', display: 'flex', gap: '5px', borderTop:'1px solid #eee' }}><input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="..." style={{flex:1, padding:'8px', borderRadius:'8px', border:'1px solid #ddd'}} /><button style={{background:'#166534', color:'#fff', border:'none', borderRadius:'8px', padding:'0 10px'}}>➔</button></form>
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const [tarefas, setTarefas] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSelecaoOpen, setIsSelecaoOpen] = useState(false)
  const [notificacao, setNotificacao] = useState(0)
  
  const [fileBoleto, setFileBoleto] = useState(null)
  const [foiBaixado, setFoiBaixado] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
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

      // ESCUTA GLOBAL + SOM (TRATADO)
      supabase.channel('notificacoes').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat' }, payload => {
        if (String(payload.new.usuario_id) !== String(session.user.id)) {
          setNotificacao(n => n + 1)
          const audio = new Audio('/notificacao.mp3.mp3')
          audio.play().catch(() => {}) // Ignora erro se o arquivo não existir
        }
      }).subscribe()
    }
    init()
  }, [router])

  const handleAvanco = async () => {
    if (!tarefaSelecionada) return
    let updates = {}
    try {
      if (tarefaSelecionada.status === 'gerar_boleto') {
        if (!fileBoleto) return alert("Anexe o boleto!")
        const path = `boletos/${Date.now()}-${fileBoleto.name}`
        await supabase.storage.from('anexos').upload(path, fileBoleto)
        const { data } = supabase.storage.from('anexos').getPublicUrl(path)
        updates = { status: 'enviar_cliente', tarefa: 'Enviar para Cliente', anexo_boleto: data.publicUrl }
      } else if (tarefaSelecionada.status === 'enviar_cliente') {
        if (!foiBaixado) return alert("Baixe o arquivo primeiro!")
        updates = { status: 'aguardando_vencimento', tarefa: 'Aguardando Pagamento' }
      }
      await supabase.from('Chamado_NF').update(updates).eq('id', tarefaSelecionada.id)
      window.location.reload()
    } catch (e) { alert(e.message) }
  }

  if (loading) return <div style={{padding:'100px', textAlign:'center', fontWeight:'bold'}}>Carregando...</div>

  return (
    <div style={{ padding: '30px 20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* CSS PARA O SINO BALANÇAR */}
      <style>{`
        @keyframes shake {
          0% { transform: rotate(0); }
          20% { transform: rotate(15deg); }
          40% { transform: rotate(-15deg); }
          60% { transform: rotate(10deg); }
          100% { transform: rotate(0); }
        }
        .bell-shake { animation: shake 0.5s ease-in-out infinite; }
      `}</style>

      <header style={{ background: 'white', padding: '20px', borderRadius: '30px', display: 'flex', justifyContent: 'space-between', marginBottom: '40px', alignItems:'center', boxShadow:'0 10px 30px rgba(0,0,0,0.05)' }}>
        <div><b>{userProfile?.nome}</b><p style={{margin:0, fontSize:'10px'}}>{userProfile?.funcao}</p></div>
        <div style={{ display: 'flex', gap: '15px', alignItems:'center' }}>
          <div onClick={() => setNotificacao(0)} style={{ position: 'relative', fontSize: '24px', cursor: 'pointer' }} className={notificacao > 0 ? 'bell-shake' : ''}>
            🔔{notificacao > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', fontSize: '9px', borderRadius: '50%', padding: '2px 5px' }}>{notificacao}</span>}
          </div>
          <button onClick={() => router.push('/kanban')} style={{ background: '#f0fdf4', color: '#166534', border: 'none', padding: '10px 18px', borderRadius: '12px', fontWeight: '900', fontSize: '10px', cursor: 'pointer' }}>📊 KANBAN</button>
          <button onClick={() => setIsSelecaoOpen(true)} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '10px 25px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>+ NOVO</button>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} style={{border:'none', background:'none', color:'red', cursor:'pointer', fontSize:'11px'}}>SAIR</button>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h2 style={{fontSize:'20px', fontWeight:'900', color:'#14532d'}}>Tarefas Pendentes</h2>
        {tarefas.map(t => (
          <div key={t.id} onClick={() => { setTarefaSelecionada(t); setFoiBaixado(false); }} style={{ background: 'white', padding: '25px', borderRadius: '25px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow:'0 5px 15px rgba(0,0,0,0.03)' }}>
            <div><span style={{ fontSize: '8px', fontWeight: '900', color: '#166534', background: 'rgba(34,197,94,0.1)', padding: '4px 8px', borderRadius: '6px' }}>{(t.tarefa || 'Processando').toUpperCase()}</span><h3 style={{margin:'5px 0 0 0'}}>{t.nom_cliente}</h3></div>
            <b style={{ color: '#166534', fontSize:'18px' }}>R$ {t.valor_servico}</b>
          </div>
        ))}
      </div>

      {tarefaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '950px', borderRadius: '40px', display: 'grid', gridTemplateColumns: '1fr 380px', overflow: 'hidden' }}>
            <div style={{ padding: '40px', overflowY: 'auto', maxHeight: '85vh' }}>
              <h2 style={{ color: '#14532d', margin: 0 }}>{tarefaSelecionada.nom_cliente}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '30px' }}>
                {tarefaSelecionada.status === 'gerar_boleto' && <input type="file" onChange={e => setFileBoleto(e.target.files[0])} />}
                {tarefaSelecionada.status === 'enviar_cliente' && (
                  <button onClick={() => { window.open(tarefaSelecionada.anexo_boleto); setFoiBaixado(true); }} style={{ background: '#eff6ff', border: '1px solid #3b82f6', padding: '15px', borderRadius: '12px', color: '#1d4ed8', fontWeight: 'bold' }}>⬇ BAIXAR BOLETO</button>
                )}
                <button onClick={handleAvanco} style={{ background: 'black', color: 'white', padding: '18px', borderRadius: '15px', fontWeight: 'bold', border:'none', cursor:'pointer' }}>AVANÇAR PROCESSO ⮕</button>
                <button onClick={() => setTarefaSelecionada(null)} style={{ background: 'none', border: 'none', color: '#999', cursor:'pointer', fontWeight:'bold' }}>FECHAR</button>
              </div>
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
            <button onClick={() => router.push('/novo-chamado-nf')} style={{ width: '100%', background: '#22c55e', color: 'white', padding: '20px', borderRadius: '15px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>📑 NOTA FISCAL / FATURAMENTO</button>
            <button onClick={() => setIsSelecaoOpen(false)} style={{ background: 'none', border: 'none', color: '#999', marginTop:'15px', cursor:'pointer' }}>CANCELAR</button>
          </div>
        </div>
      )}

      {userProfile && <ChatFlutuante userProfile={userProfile} />}
    </div>
  )
}