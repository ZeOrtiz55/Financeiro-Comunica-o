'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// --- COMPONENTE DE CHAT (BEM PROTEGIDO) ---
function ChatIntegrado({ chamadoId, userProfile }) {
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()

  useEffect(() => {
    if (!chamadoId || !userProfile?.id) return
    
    // 1. Carregar histórico
    supabase.from('mensagens_chat').select('*').eq('chamado_id', chamadoId).order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("Erro chat:", error)
        if (data) setMensagens(data)
      })

    // 2. Realtime
    const channel = supabase.channel(`chat_${chamadoId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat', filter: `chamado_id=eq.${chamadoId}` }, 
        payload => { 
          if (String(payload.new.usuario_id) !== String(userProfile.id)) {
            setMensagens(prev => [...prev, payload.new])
          }
        }
      ).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [chamadoId, userProfile?.id])

  const enviar = async (e) => {
    e.preventDefault()
    if (!novaMsg.trim() || !userProfile?.id || !chamadoId) return
    const texto = novaMsg; setNovaMsg('')
    
    // Update Otimista (aparece na hora)
    setMensagens(prev => [...prev, { id: Date.now(), texto, usuario_nome: userProfile?.nome, usuario_id: userProfile?.id }])
    
    const { error } = await supabase.from('mensagens_chat').insert([{ 
      texto, 
      usuario_nome: userProfile?.nome, 
      usuario_id: userProfile?.id, 
      chamado_id: chamadoId 
    }])
    if (error) console.error("Erro ao salvar no banco:", error)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '1px solid #eee', paddingLeft: '20px' }}>
      <h4 style={{fontSize:'12px', color:'#22c55e', marginBottom:'10px'}}>CHAT DO CHAMADO</h4>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background:'#f8fafc', borderRadius:'15px' }}>
        {mensagens.map(m => (
          <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile?.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile?.id) ? '#22c55e' : 'white', color: String(m.usuario_id) === String(userProfile?.id) ? 'white' : 'black', padding: '10px', borderRadius: '12px', fontSize: '11px', maxWidth: '85%', boxShadow:'0 2px 5px rgba(0,0,0,0.05)' }}>
            <b style={{ fontSize: '8px', display: 'block' }}>{m.usuario_nome}</b>{m.texto}
          </div>
        ))}
      </div>
      <form onSubmit={enviar} style={{ display: 'flex', gap: '5px', paddingTop: '10px' }}>
        <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Tirar dúvida..." style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #ddd', fontSize:'12px' }} />
        <button style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '10px', padding: '10px' }}>➔</button>
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
      
      const { data: chamados } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido')
      const filtradas = (chamados || []).filter(t => {
        if (prof?.funcao === 'Financeiro') return t.status === 'gerar_boleto'
        if (prof?.funcao === 'Pós-Vendas') return t.status === 'enviar_cliente' || t.status === 'vencido'
        return false
      })
      setTarefas(filtradas)
      setLoading(false)

      supabase.channel('global').on('postgres_changes', { event:'INSERT', schema:'public', table:'mensagens_chat' }, payload => {
        if (String(payload.new.usuario_id) !== String(session.user.id)) setNotificacao(n => n + 1)
      }).subscribe()
    }
    carregar()
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
    <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <header style={{ background: 'rgba(255,255,255,0.5)', padding: '20px', borderRadius: '30px', display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems:'center' }}>
        <div><b>{userProfile?.nome}</b><p style={{margin:0, fontSize:'10px'}}>{userProfile?.funcao}</p></div>
        <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
          <div onClick={() => setNotificacao(0)} style={{position:'relative', fontSize:'22px', cursor:'pointer'}}>🔔{notificacao > 0 && <span style={{position:'absolute', top:'-5px', right:'-5px', background:'red', color:'white', fontSize:'9px', borderRadius:'50%', padding:'2px 5px'}}>{notificacao}</span>}</div>
          <button onClick={() => router.push('/kanban')} style={{padding:'10px 15px', borderRadius:'10px', border:'none', background:'#000', color:'#fff', fontWeight:'bold', cursor:'pointer'}}>📊 FLUXO KANBAN</button>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {tarefas.map(t => (
          <div key={t.id} onClick={() => {setTarefaSelecionada(t); setFoiBaixado(false)}} style={{ background: 'white', padding: '25px', borderRadius: '25px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems:'center', boxShadow:'0 5px 15px rgba(0,0,0,0.03)' }}>
            <div>
              <span style={{fontSize:'8px', background: '#f0fdf4', padding:'4px 8px', borderRadius:'5px', color: '#166534', fontWeight:'bold'}}>{t.tarefa?.toUpperCase() || 'TAREFA'}</span>
              <h3 style={{margin:'8px 0 0 0', fontSize:'16px'}}>{t.nom_cliente}</h3>
            </div>
            <b style={{fontSize:'18px', color:'#166534'}}>R$ {t.valor_servico}</b>
          </div>
        ))}
      </div>

      {tarefaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '950px', borderRadius: '40px', display: 'grid', gridTemplateColumns: '1fr 380px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '40px', overflowY: 'auto', maxHeight: '85vh' }}>
              <h2 style={{ color: '#14532d', margin: '0' }}>{tarefaSelecionada?.nom_cliente}</h2>
              <span style={{fontSize:'10px', color:'#22c55e', fontWeight:'bold'}}>{tarefaSelecionada?.tarefa?.toUpperCase()}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop:'25px' }}>
                <p><b>Valor:</b> R$ {tarefaSelecionada?.valor_servico}</p>
                {tarefaSelecionada?.status === 'gerar_boleto' && (
                  <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '20px', border: '1px solid #22c55e' }}><input type="file" onChange={e => setFileBoleto(e.target.files[0])} /></div>
                )}
                {tarefaSelecionada?.status === 'enviar_cliente' && (
                  <div style={{ background: '#eff6ff', padding: '20px', borderRadius: '20px', border: '1px solid #3b82f6' }}>
                    <a href={tarefaSelecionada?.anexo_boleto} target="_blank" onClick={() => setFoiBaixado(true)} style={{ background: '#3b82f6', color: 'white', padding: '12px', borderRadius: '10px', textDecoration: 'none', display: 'block', textAlign:'center', fontWeight: 'bold' }}>⬇ BAIXAR BOLETO</a>
                  </div>
                )}
                <button onClick={handleAvanco} style={{ background: '#000', color: '#fff', padding: '18px', borderRadius: '15px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>CONCLUIR E AVANÇAR ⮕</button>
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