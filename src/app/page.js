'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// --- 1. CHAT INTEGRADO (LADO DIREITO DO MODAL DO CARD) ---
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
      <h4 style={{ fontSize: '12px', color: '#22c55e', marginBottom: '10px' }}>CONVERSA DO CHAMADO</h4>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: '#f8fafc', borderRadius: '15px' }}>
        {mensagens.map(m => (
          <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile?.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile?.id) ? '#22c55e' : 'white', color: String(m.usuario_id) === String(userProfile?.id) ? 'white' : 'black', padding: '10px', borderRadius: '12px', fontSize: '11px', maxWidth: '85%', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <b style={{ fontSize: '8px', display: 'block' }}>{m.usuario_nome}</b>{m.texto}
          </div>
        ))}
      </div>
      <form onSubmit={enviar} style={{ display: 'flex', gap: '5px', paddingTop: '15px' }}>
        <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Tirar dúvida..." style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '12px', outline: 'none' }} />
        <button style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '12px', width: '45px', cursor: 'pointer' }}>➔</button>
      </form>
    </div>
  )
}

// --- 2. CHAT FLUTUANTE (GERAL - CANTO DA TELA) ---
function ChatFlutuante({ userProfile }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const [unread, setUnread] = useState(0)
  const scrollRef = useRef()

  useEffect(() => {
    if (!userProfile?.id) return
    supabase.from('mensagens_chat').select('*').is('chamado_id', null).order('created_at', { ascending: true }).limit(50)
      .then(({ data }) => data && setMensagens(data))

    const channel = supabase.channel('chat_geral').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat' }, 
      payload => {
        if (!payload.new.chamado_id) {
           if (String(payload.new.usuario_id) !== String(userProfile.id)) {
              setMensagens(prev => [...prev, payload.new])
              if (!isOpen) setUnread(c => c + 1)
           }
        }
      }
    ).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userProfile?.id, isOpen])

  const enviar = async (e) => {
    e.preventDefault()
    if (!novaMsg.trim()) return
    const t = novaMsg; setNovaMsg('')
    setMensagens(prev => [...prev, { id: Date.now(), texto: t, usuario_nome: userProfile.nome, usuario_id: userProfile.id }])
    await supabase.from('mensagens_chat').insert([{ texto: t, usuario_nome: userProfile.nome, usuario_id: userProfile.id }])
  }

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 3000 }}>
      <button onClick={() => {setIsOpen(!isOpen); setUnread(0)}} style={{ width: '65px', height: '65px', borderRadius: '50%', background: '#166534', color: 'white', border: 'none', fontSize: '28px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
        {isOpen ? '✕' : '💬'}
        {!isOpen && unread > 0 && <div style={{ position:'absolute', top:0, right:0, background:'red', width:'20px', height:'20px', borderRadius:'50%', fontSize:'10px', display:'flex', alignItems:'center', justifyContent:'center' }}>{unread}</div>}
      </button>
      {isOpen && (
        <div style={{ position: 'absolute', bottom: '80px', right: 0, width: '320px', height: '450px', background: 'white', borderRadius: '25px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', border: '1px solid #eee', overflow: 'hidden' }}>
           <div style={{ padding: '15px', background: '#166534', color: 'white', fontWeight: 'bold' }}>Chat Geral</div>
           <div ref={scrollRef} style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {mensagens.map(m => (
                <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile.id) ? '#22c55e' : '#eee', color: String(m.usuario_id) === String(userProfile.id) ? 'white' : 'black', padding: '10px', borderRadius: '12px', fontSize: '11px' }}>
                  <b style={{fontSize:'8px', display:'block'}}>{m.usuario_nome}</b>{m.texto}
                </div>
              ))}
           </div>
           <form onSubmit={enviar} style={{ padding: '10px', display: 'flex', gap: '5px' }}>
              <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Dúvida..." style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #ddd' }} />
              <button style={{ background: '#166534', color: 'white', border: 'none', borderRadius: '10px', padding: '0 15px' }}>➔</button>
           </form>
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
  const [notificacao, setNotificacao] = useState(0)
  
  // Regras de Trava
  const [fileBoleto, setFileBoleto] = useState(null)
  const [foiBaixado, setFoiBaixado] = useState(false)

  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/login')
      const { data: prof } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single()
      setUserProfile(prof)
      
      const { data: chamados } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido').order('id', {ascending: false})
      const filtradas = (chamados || []).filter(t => {
        if (prof?.funcao === 'Financeiro') return t.status === 'gerar_boleto'
        if (prof?.funcao === 'Pós-Vendas') return t.status === 'enviar_cliente' || t.status === 'vencido'
        return false
      })
      setTarefas(filtradas)
      setLoading(false)

      supabase.channel('global').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat' }, payload => {
        if (String(payload.new.usuario_id) !== String(session.user.id)) setNotificacao(n => n + 1)
      }).subscribe()
    }
    init()
  }, [router])

  const handleAvanco = async () => {
    let updates = {}
    if (tarefaSelecionada.status === 'gerar_boleto') {
      if (!fileBoleto) return alert("ERRO: Anexe o boleto!")
      const path = `boletos/${Date.now()}-${fileBoleto.name}`
      await supabase.storage.from('anexos').upload(path, fileBoleto)
      const { data } = supabase.storage.from('anexos').getPublicUrl(path)
      updates = { status: 'enviar_cliente', tarefa: 'Enviar para Cliente', anexo_boleto: data.publicUrl }
    } else if (tarefaSelecionada.status === 'enviar_cliente') {
      if (!foiBaixado) return alert("ERRO: Baixe o boleto primeiro!")
      updates = { status: 'aguardando_vencimento', tarefa: 'Aguardando Pagamento' }
    }
    await supabase.from('Chamado_NF').update(updates).eq('id', tarefaSelecionada.id)
    window.location.reload()
  }

  const glassStyle = { background: 'rgba(255, 255, 255, 0.45)', backdropFilter: 'blur(15px)', border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: '35px' }

  if (loading) return <div style={{padding:'100px', textAlign:'center', fontWeight:'bold'}}>Carregando...</div>

  return (
    <div style={{ padding: '30px 20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* HEADER COMPLETO */}
      <header style={{ ...glassStyle, padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '45px', height: '45px', background: '#22c55e', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>{userProfile?.nome?.charAt(0)}</div>
          <div><h1 style={{ fontSize: '14px', margin: 0 }}>{userProfile?.nome}</h1><p style={{ fontSize: '10px', color: '#166534', fontWeight: 'bold' }}>{userProfile?.funcao}</p></div>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div onClick={() => setNotificacao(0)} style={{ position: 'relative', fontSize: '22px', cursor: 'pointer' }}>🔔{notificacao > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', fontSize: '9px', borderRadius: '50%', padding: '2px 5px' }}>{notificacao}</span>}</div>
          <button onClick={() => router.push('/kanban')} style={{ background: '#f0fdf4', color: '#166534', border: 'none', padding: '10px 15px', borderRadius: '12px', fontWeight: '900', fontSize: '10px', cursor: 'pointer' }}>📊 FLUXO NF</button>
          <button onClick={() => setIsSelecaoOpen(true)} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>+ NOVO</button>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} style={{ background: 'none', border: 'none', color: '#B91C1C', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>SAIR</button>
        </div>
      </header>

      {/* LISTA DE TAREFAS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#14532d' }}>Sua Fila de Trabalho</h2>
        {tarefas.map(t => (
          <div key={t.id} onClick={() => { setTarefaSelecionada(t); setFoiBaixado(false); }} style={{ ...glassStyle, padding: '25px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '8px', fontWeight: '900', color: '#166534', background: 'rgba(34,197,94,0.1)', padding: '4px 8px', borderRadius: '6px' }}>{t.tarefa.toUpperCase()}</span>
              <h3 style={{ margin: '8px 0 0 0', fontWeight: '800' }}>{t.nom_cliente}</h3>
            </div>
            <p style={{ fontWeight: '900', fontSize: '18px', color: '#166534' }}>R$ {t.valor_servico}</p>
          </div>
        ))}
      </div>

      {/* MODAL SPLIT (DETALHES + CHAT) */}
      {tarefaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '950px', borderRadius: '40px', display: 'grid', gridTemplateColumns: '1fr 380px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '40px', overflowY: 'auto', maxHeight: '85vh' }}>
              <h2 style={{ color: '#14532d', margin: 0 }}>{tarefaSelecionada.nom_cliente}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '25px' }}>
                <p><b>Status:</b> {tarefaSelecionada.tarefa}</p>
                {tarefaSelecionada.status === 'gerar_boleto' && (
                  <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '20px', border: '1px solid #22c55e' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '12px', display: 'block', marginBottom: '10px' }}>ANEXAR BOLETO:</label>
                    <input type="file" onChange={e => setFileBoleto(e.target.files[0])} />
                  </div>
                )}
                {tarefaSelecionada.status === 'enviar_cliente' && (
                  <div style={{ background: '#eff6ff', padding: '20px', borderRadius: '20px', border: '1px solid #3b82f6' }}>
                    <a href={tarefaSelecionada.anexo_boleto} target="_blank" onClick={() => setFoiBaixado(true)} style={{ background: '#3b82f6', color: 'white', padding: '12px', borderRadius: '10px', textDecoration: 'none', display: 'block', textAlign: 'center', fontWeight: 'bold' }}>⬇ BAIXAR ARQUIVO</a>
                  </div>
                )}
                <button onClick={handleAvanco} style={{ background: '#000', color: '#fff', padding: '18px', borderRadius: '15px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>CONCLUIR E AVANÇAR ⮕</button>
                <button onClick={() => setTarefaSelecionada(null)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontWeight: 'bold' }}>FECHAR</button>
              </div>
            </div>
            <div style={{ padding: '30px', background: '#f8fafc' }}>
              {userProfile && <ChatChamado chamadoId={tarefaSelecionada.id} userProfile={userProfile} />}
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVO CHAMADO */}
      {isSelecaoOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '45px', width: '90%', maxWidth: '400px', textAlign: 'center' }}>
            <h3 style={{ fontWeight: '900', marginBottom: '20px' }}>Novo Chamado</h3>
            <button onClick={() => router.push('/novo-chamado-nf')} style={{ width: '100%', background: '#22c55e', color: 'white', padding: '20px', borderRadius: '15px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>📑 NOTA FISCAL / FATURAMENTO</button>
            <button onClick={() => setIsSelecaoOpen(false)} style={{ background: 'none', border: 'none', color: '#999', marginTop: '15px', cursor: 'pointer' }}>CANCELAR</button>
          </div>
        </div>
      )}

      {userProfile && <ChatFlutuante userProfile={userProfile} />}
    </div>
  )
}