'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// --- CHAT DENTRO DO CARD ---
function ChatChamado({ chamadoId, userProfile }) {
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()

  useEffect(() => {
    if (!chamadoId || !userProfile?.id) return
    supabase.from('mensagens_chat').select('*').eq('chamado_id', chamadoId).order('created_at', { ascending: true })
      .then(({ data }) => data && setMensagens(data))

    const channel = supabase.channel(`chat_card_${chamadoId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat', filter: `chamado_id=eq.${chamadoId}` }, 
      payload => { if (String(payload.new.usuario_id) !== String(userProfile.id)) setMensagens(prev => [...prev, payload.new]) }
    ).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [chamadoId, userProfile?.id])

  const enviar = async (e) => {
    e.preventDefault()
    if (!novaMsg.trim() || !userProfile?.id) return
    const texto = novaMsg; setNovaMsg('')
    setMensagens(prev => [...prev, { id: Date.now(), texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id }])
    await supabase.from('mensagens_chat').insert([{ texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id, chamado_id: chamadoId }])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '1px solid #eee', paddingLeft: '20px' }}>
      <h4 style={{ fontSize: '12px', color: '#22c55e', marginBottom: '10px' }}>CONVERSA DO CHAMADO</h4>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: '#f8fafc', borderRadius: '15px' }}>
        {mensagens.map(m => (
          <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile?.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile?.id) ? '#22c55e' : 'white', color: String(m.usuario_id) === String(userProfile?.id) ? 'white' : 'black', padding: '10px', borderRadius: '12px', fontSize: '11px', maxWidth: '85%', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <b style={{ fontSize: '8px', display: 'block' }}>{m.usuario_nome}</b>{m.texto}
          </div>
        ))}
      </div>
      <form onSubmit={enviar} style={{ display: 'flex', gap: '5px', paddingTop: '15px' }}>
        <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Tirar dúvida..." style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '12px' }} />
        <button style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '12px', width: '45px', cursor: 'pointer' }}>➔</button>
      </form>
    </div>
  )
}

// --- CHAT GERAL FLUTUANTE ---
function ChatFlutuante({ userProfile }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()

  useEffect(() => {
    if (!userProfile?.id) return
    supabase.from('mensagens_chat').select('*').is('chamado_id', null).order('created_at', { ascending: true }).limit(50)
      .then(({ data }) => data && setMensagens(data))

    const channel = supabase.channel('chat_geral').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat' }, 
      payload => { if (!payload.new.chamado_id && String(payload.new.usuario_id) !== String(userProfile.id)) setMensagens(prev => [...prev, payload.new]) }
    ).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userProfile?.id])

  const enviar = async (e) => {
    e.preventDefault()
    if (!novaMsg.trim()) return
    const t = novaMsg; setNovaMsg('')
    setMensagens(prev => [...prev, { id: Date.now(), texto: t, usuario_nome: userProfile.nome, usuario_id: userProfile.id }])
    await supabase.from('mensagens_chat').insert([{ texto: t, usuario_nome: userProfile.nome, usuario_id: userProfile.id }])
  }

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 3000 }}>
      <button onClick={() => setIsOpen(!isOpen)} style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#166534', color: 'white', border: 'none', fontSize: '24px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>{isOpen ? '✕' : '💬'}</button>
      {isOpen && (
        <div style={{ position: 'absolute', bottom: '75px', right: 0, width: '300px', height: '400px', background: 'white', borderRadius: '20px', display: 'flex', flexDirection: 'column', boxShadow: '0 15px 30px rgba(0,0,0,0.1)', border: '1px solid #ddd', overflow: 'hidden' }}>
           <div style={{ padding: '12px', background: '#166534', color: 'white', fontWeight: 'bold', fontSize:'13px' }}>Chat Geral</div>
           <div style={{ flex: 1, padding: '10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {mensagens.map(m => (
                <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile.id) ? '#22c55e' : '#eee', color: String(m.usuario_id) === String(userProfile.id) ? 'white' : 'black', padding: '8px', borderRadius: '10px', fontSize: '11px' }}>{m.texto}</div>
              ))}
           </div>
           <form onSubmit={enviar} style={{ padding: '10px', display: 'flex', gap: '5px', borderTop:'1px solid #eee' }}>
              <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Dúvida..." style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #ddd', fontSize:'11px' }} />
              <button style={{ background: '#166534', color: 'white', border: 'none', borderRadius: '8px', padding: '0 10px' }}>➔</button>
           </form>
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const [tarefas, setTarefas] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null)
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
    }
    init()
  }, [router])

  const handleAvanco = async () => {
    let updates = {}
    if (tarefaSelecionada.status === 'gerar_boleto') {
      if (!fileBoleto) return alert("Anexe o boleto!")
      const path = `boletos/${Date.now()}-${fileBoleto.name}`
      await supabase.storage.from('anexos').upload(path, fileBoleto)
      const { data } = supabase.storage.from('anexos').getPublicUrl(path)
      updates = { status: 'enviar_cliente', tarefa: 'Enviar para Cliente', anexo_boleto: data.publicUrl }
    } else if (tarefaSelecionada.status === 'enviar_cliente') {
      if (!foiBaixado) return alert("Baixe o boleto primeiro!")
      updates = { status: 'aguardando_vencimento', tarefa: 'Aguardando Pagamento' }
    }
    await supabase.from('Chamado_NF').update(updates).eq('id', tarefaSelecionada.id)
    window.location.reload()
  }

  if (loading) return <div style={{padding:'100px', textAlign:'center', fontWeight:'bold'}}>Carregando...</div>

  return (
    <div style={{ padding: '30px 20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      <header style={{ background: 'white', padding: '20px', borderRadius: '30px', display: 'flex', justifyContent: 'space-between', marginBottom: '40px', alignItems:'center', boxShadow:'0 10px 30px rgba(0,0,0,0.05)' }}>
        <div><b>{userProfile?.nome}</b><p style={{margin:0, fontSize:'10px'}}>{userProfile?.funcao}</p></div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => router.push('/kanban')} style={{ background: '#f0fdf4', color: '#166534', border: 'none', padding: '12px 18px', borderRadius: '12px', fontWeight: '900', fontSize: '10px', cursor: 'pointer' }}>📊 KANBAN</button>
          <button onClick={() => setIsSelecaoOpen(true)} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>+ NOVO</button>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {tarefas.map(t => (
          <div key={t.id} onClick={() => { setTarefaSelecionada(t); setFoiBaixado(false); }} style={{ background: 'white', padding: '25px', borderRadius: '25px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow:'0 5px 15px rgba(0,0,0,0.03)' }}>
            <div><span style={{ fontSize: '8px', fontWeight: '900', color: '#166534', background: 'rgba(34,197,94,0.1)', padding: '4px 8px', borderRadius: '6px' }}>{(t.tarefa || 'TAREFA').toUpperCase()}</span><h3>{t.nom_cliente}</h3></div>
            <b style={{ color: '#166534' }}>R$ {t.valor_servico}</b>
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
                <button onClick={handleAvanco} style={{ background: 'black', color: 'white', padding: '18px', borderRadius: '15px', fontWeight: 'bold' }}>AVANÇAR PROCESSO ⮕</button>
                <button onClick={() => setTarefaSelecionada(null)} style={{ background: 'none', border: 'none', color: '#999', cursor:'pointer' }}>FECHAR</button>
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