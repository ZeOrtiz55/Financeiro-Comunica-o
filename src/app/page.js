'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// --- CHAT INTEGRADO (SAFE VERSION) ---
function ChatIntegrado({ chamadoId, userProfile }) {
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()

  useEffect(() => {
    if (!chamadoId || !userProfile?.id) return
    
    supabase.from('mensagens_chat').select('*').eq('chamado_id', chamadoId).order('created_at', { ascending: true })
      .then(({ data }) => data && setMensagens(data))

    const channel = supabase.channel(`chat_${chamadoId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat', filter: `chamado_id=eq.${chamadoId}` }, 
        payload => { 
          if (String(payload.new.usuario_id) !== String(userProfile?.id)) {
            setMensagens(prev => [...prev, payload.new])
          }
        }
      ).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [chamadoId, userProfile?.id])

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [mensagens])

  const enviar = async (e) => {
    e.preventDefault()
    if (!novaMsg.trim() || !userProfile?.id) return
    const texto = novaMsg; setNovaMsg('')
    const temp = { id: Date.now(), texto, usuario_nome: userProfile?.nome, usuario_id: userProfile?.id }
    setMensagens(prev => [...prev, temp])
    await supabase.from('mensagens_chat').insert([{ texto, usuario_nome: userProfile?.nome, usuario_id: userProfile?.id, chamado_id: chamadoId }])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '500px', borderLeft: '1px solid #eee', paddingLeft: '20px' }}>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px' }}>
        {mensagens.map(m => (
          <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile?.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile?.id) ? '#22c55e' : '#f1f5f9', color: String(m.usuario_id) === String(userProfile?.id) ? 'white' : 'black', padding: '10px', borderRadius: '12px', fontSize: '12px', maxWidth: '85%' }}>
            <b style={{ fontSize: '8px', display: 'block', opacity: 0.6 }}>{m.usuario_nome}</b>{m.texto}
          </div>
        ))}
      </div>
      <form onSubmit={enviar} style={{ display: 'flex', gap: '5px', paddingTop: '10px' }}>
        <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Tirar dúvida..." style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '13px' }} />
        <button style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '10px', padding: '10px', cursor:'pointer' }}>➔</button>
      </form>
    </div>
  )
}

export default function Home() {
  const [tarefas, setTarefas] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notificacao, setNotificacao] = useState(0)
  const [fileBoleto, setFileBoleto] = useState(null)
  const [foiBaixado, setFoiBaixado] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const carregar = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/login')
      const { data: prof } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single()
      setUserProfile(prof)
      
      const { data: chamados } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido').order('id', {ascending: false})
      const filtradas = (chamados || []).filter(t => {
        if (prof?.funcao === 'Financeiro') return t.status === 'gerar_boleto' || t.status === 'validar_pix'
        if (prof?.funcao === 'Pós-Vendas') return t.status === 'enviar_cliente' || t.status === 'vencido'
        return false
      })
      setTarefas(filtradas)
      setLoading(false)

      // Escuta global de mensagens para o SINO
      supabase.channel('global_msgs').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat' }, payload => {
        if (String(payload.new.usuario_id) !== String(session.user.id)) setNotificacao(n => n + 1)
      }).subscribe()
    }
    carregar()
  }, [])

  const handleAvanco = async () => {
    if (!tarefaSelecionada) return
    let updates = {}
    try {
      if (tarefaSelecionada.status === 'gerar_boleto') {
        if (!fileBoleto) return alert("TRAVA: Anexe o boleto!")
        const path = `boletos/${Date.now()}-${fileBoleto.name}`
        await supabase.storage.from('anexos').upload(path, fileBoleto)
        const { data } = supabase.storage.from('anexos').getPublicUrl(path)
        updates = { status: 'enviar_cliente', tarefa: 'Enviar para Cliente', anexo_boleto: data.publicUrl }
      } else if (tarefaSelecionada.status === 'enviar_cliente') {
        if (!foiBaixado) return alert("TRAVA: Baixe o boleto primeiro!")
        updates = { status: 'aguardando_vencimento', tarefa: 'Aguardando Pagamento' }
      }
      const { error } = await supabase.from('Chamado_NF').update(updates).eq('id', tarefaSelecionada.id)
      if (!error) window.location.reload()
    } catch (e) { alert(e.message) }
  }

  if (loading) return <div style={{padding:'100px', textAlign:'center', fontWeight:'bold'}}>Carregando...</div>

  return (
    <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <header style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(10px)', padding: '20px', borderRadius: '30px', display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems:'center' }}>
        <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
           <div style={{width:'40px', height:'40px', background:'#22c55e', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff'}}>{userProfile?.nome?.charAt(0)}</div>
           <div><b>{userProfile?.nome}</b><p style={{margin:0, fontSize:'10px'}}>{userProfile?.funcao}</p></div>
        </div>
        <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
          <div onClick={() => setNotificacao(0)} style={{position:'relative', fontSize:'20px', cursor:'pointer'}}>🔔{notificacao > 0 && <span style={{position:'absolute', top:'-5px', right:'-5px', background:'red', color:'white', fontSize:'9px', borderRadius:'50%', padding:'2px 5px'}}>{notificacao}</span>}</div>
          <button onClick={() => router.push('/kanban')} style={{padding:'10px 15px', borderRadius:'10px', border:'none', background:'#000', color:'#fff', fontWeight:'bold', cursor:'pointer', fontSize:'11px'}}>FLUXO KANBAN</button>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {tarefas.map(t => (
          <div key={t.id} onClick={() => {setTarefaSelecionada(t); setFoiBaixado(false)}} style={{ background: 'white', padding: '25px', borderRadius: '25px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems:'center', boxShadow:'0 5px 15px rgba(0,0,0,0.03)' }}>
            <div><span style={{fontSize:'9px', background:'#f0fdf4', padding:'4px 8px', borderRadius:'5px', color:'#166534', fontWeight:'bold'}}>{t.tarefa}</span><h3 style={{margin:'8px 0 0 0', fontSize:'16px'}}>{t.nom_cliente}</h3></div>
            <b style={{fontSize:'18px', color:'#166534'}}>R$ {t.valor_servico}</b>
          </div>
        ))}
      </div>

      {tarefaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '900px', borderRadius: '40px', display: 'grid', gridTemplateColumns: '1fr 350px', overflow: 'hidden' }}>
            <div style={{ padding: '40px', overflowY: 'auto', maxHeight: '80vh' }}>
              <h2 style={{ color: '#14532d', margin: '0 0 10px 0' }}>{tarefaSelecionada?.nom_cliente}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop:'20px' }}>
                <p style={{fontSize:'14px'}}><b>Status:</b> {tarefaSelecionada?.tarefa}</p>
                {tarefaSelecionada?.status === 'gerar_boleto' && (
                  <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '20px' }}>
                    <label style={{ fontWeight: 'bold', fontSize:'12px' }}>ANEXAR BOLETO:</label>
                    <input type="file" onChange={e => setFileBoleto(e.target.files[0])} style={{marginTop:'10px', display:'block'}} />
                  </div>
                )}
                {tarefaSelecionada?.status === 'enviar_cliente' && (
                  <div style={{ background: '#eff6ff', padding: '20px', borderRadius: '20px' }}>
                    <a href={tarefaSelecionada?.anexo_boleto} target="_blank" onClick={() => setFoiBaixado(true)} style={{ background: '#3b82f6', color: 'white', padding: '12px', borderRadius: '10px', textDecoration: 'none', display: 'block', textAlign:'center', fontWeight: 'bold' }}>⬇ BAIXAR BOLETO</a>
                  </div>
                )}
                <button onClick={handleAvanco} style={{ background: '#000', color: '#fff', padding: '18px', borderRadius: '15px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>AVANÇAR PROCESSO ⮕</button>
                <button onClick={() => setTarefaSelecionada(null)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontWeight:'bold' }}>FECHAR</button>
              </div>
            </div>
            <div style={{ padding: '30px', background: '#f8fafc' }}>
              {userProfile && <ChatIntegrado chamadoId={tarefaSelecionada?.id} userProfile={userProfile} />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}