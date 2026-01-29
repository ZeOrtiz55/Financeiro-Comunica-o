'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// --- CHAT LADO A LADO ---
function ChatIntegrado({ chamadoId, userProfile }) {
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()

  useEffect(() => {
    if (!chamadoId || !userProfile?.id) return
    
    // Carregar histórico
    supabase.from('mensagens_chat').select('*').eq('chamado_id', chamadoId).order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("Erro ao carregar chat:", error)
        if (data) setMensagens(data)
      })

    // Escuta Realtime
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

  const enviar = async (e) => {
    e.preventDefault()
    if (!novaMsg.trim() || !userProfile?.id) return
    const texto = novaMsg; setNovaMsg('')
    
    // Update Otimista
    setMensagens(prev => [...prev, { id: Date.now(), texto, usuario_nome: userProfile?.nome, usuario_id: userProfile?.id }])
    
    const { error } = await supabase.from('mensagens_chat').insert([{ 
      texto, 
      usuario_nome: userProfile?.nome, 
      usuario_id: userProfile?.id, 
      chamado_id: chamadoId 
    }])
    if (error) alert("Erro ao salvar mensagem: " + error.message)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '1px solid #eee', paddingLeft: '20px' }}>
      <h4 style={{fontSize:'12px', color:'#22c55e', marginBottom:'10px'}}>CONVERSA DO CHAMADO</h4>
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
  
  // Estados de Regras
  const [fileBoleto, setFileBoleto] = useState(null)
  const [fileComprovante, setFileComprovante] = useState(null)
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
        if (prof?.funcao === 'Financeiro') return t.status === 'gerar_boleto'
        if (prof?.funcao === 'Pós-Vendas') return t.status === 'enviar_cliente' || t.status === 'vencido'
        return false
      })
      setTarefas(filtradas)
      setLoading(false)

      // Notificações SINO
      supabase.channel('global_msgs').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat' }, payload => {
        if (String(payload.new.usuario_id) !== String(session.user.id)) setNotificacao(n => n + 1)
      }).subscribe()
    }
    carregar()
  }, [])

  const handleAvanco = async () => {
    let updates = {}
    const status = tarefaSelecionada.status

    if (status === 'gerar_boleto') {
      if (!fileBoleto) return alert("TRAVA: Anexe o boleto para o card sair do Financeiro!")
      const path = `boletos/${Date.now()}-${fileBoleto.name}`
      await supabase.storage.from('anexos').upload(path, fileBoleto)
      const { data } = supabase.storage.from('anexos').getPublicUrl(path)
      updates = { status: 'enviar_cliente', tarefa: 'Enviar para Cliente', anexo_boleto: data.publicUrl }
    } 
    else if (status === 'enviar_cliente') {
      if (!foiBaixado) return alert("TRAVA: Baixe o boleto primeiro!")
      updates = { status: 'aguardando_vencimento', tarefa: 'Aguardando Pagamento' }
    }
    else if (status === 'vencido') {
      if (!fileComprovante) return alert("TRAVA: Anexe o comprovante para liquidar o vencido!")
      const path = `comprovantes/${Date.now()}-${fileComprovante.name}`
      await supabase.storage.from('anexos').upload(path, fileComprovante)
      const { data } = supabase.storage.from('anexos').getPublicUrl(path)
      updates = { status: 'pago', tarefa: 'Pagamento Efetuado', comprovante_pagamento: data.publicUrl }
    }

    const { error } = await supabase.from('Chamado_NF').update(updates).eq('id', tarefaSelecionada.id)
    if (!error) window.location.reload()
  }

  if (loading) return <div style={{padding:'100px', textAlign:'center'}}>Carregando...</div>

  return (
    <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* HEADER */}
      <header style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(10px)', padding: '20px', borderRadius: '30px', display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems:'center' }}>
        <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
           <div style={{width:'40px', height:'40px', background:'#22c55e', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff'}}>{userProfile?.nome?.charAt(0)}</div>
           <div><b>{userProfile?.nome}</b><p style={{margin:0, fontSize:'10px'}}>{userProfile?.funcao}</p></div>
        </div>
        <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
          <div onClick={() => setNotificacao(0)} style={{position:'relative', fontSize:'22px', cursor:'pointer'}}>🔔{notificacao > 0 && <span style={{position:'absolute', top:'-5px', right:'-5px', background:'red', color:'white', fontSize:'9px', borderRadius:'50%', padding:'2px 5px'}}>{notificacao}</span>}</div>
          <button onClick={() => router.push('/kanban')} style={{padding:'12px 18px', borderRadius:'12px', border:'none', background:'#000', color:'#fff', fontWeight:'bold', cursor:'pointer', fontSize:'11px'}}>FLUXO KANBAN</button>
        </div>
      </header>

      {/* LISTA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{fontSize:'20px', fontWeight:'900', color:'#14532d'}}>Minha Fila</h2>
        {tarefas.map(t => (
          <div key={t.id} onClick={() => {setTarefaSelecionada(t); setFoiBaixado(false)}} style={{ background: 'white', padding: '25px', borderRadius: '25px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems:'center', boxShadow:'0 5px 15px rgba(0,0,0,0.03)' }}>
            <div><span style={{fontSize:'8px', background: t.status === 'vencido' ? '#fee2e2' : '#f0fdf4', padding:'4px 8px', borderRadius:'5px', color: t.status === 'vencido' ? '#B91C1C' : '#166534', fontWeight:'bold'}}>{t.tarefa.toUpperCase()}</span><h3 style={{margin:'8px 0 0 0', fontSize:'16px'}}>{t.nom_cliente}</h3></div>
            <b style={{fontSize:'18px', color:'#166534'}}>R$ {t.valor_servico}</b>
          </div>
        ))}
      </div>

      {/* MODAL SPLIT (DETALHES + CHAT) */}
      {tarefaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '950px', borderRadius: '40px', display: 'grid', gridTemplateColumns: '1fr 380px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
            
            <div style={{ padding: '40px', overflowY: 'auto', maxHeight: '85vh' }}>
              <h2 style={{ color: '#14532d', margin: '0' }}>{tarefaSelecionada?.nom_cliente}</h2>
              <span style={{fontSize:'10px', color:'#22c55e', fontWeight:'bold'}}>{tarefaSelecionada?.tarefa.toUpperCase()}</span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop:'25px' }}>
                <p><b>Valor:</b> R$ {tarefaSelecionada?.valor_servico}</p>
                
                {tarefaSelecionada?.status === 'gerar_boleto' && (
                  <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '20px', border: '1px solid #22c55e' }}>
                    <label style={{ fontWeight: 'bold', fontSize:'12px', display:'block', marginBottom:'10px' }}>ANEXAR BOLETO (OBRIGATÓRIO):</label>
                    <input type="file" onChange={e => setFileBoleto(e.target.files[0])} />
                  </div>
                )}

                {tarefaSelecionada?.status === 'enviar_cliente' && (
                  <div style={{ background: '#eff6ff', padding: '20px', borderRadius: '20px', border: '1px solid #3b82f6' }}>
                    <label style={{ fontWeight: 'bold', fontSize:'12px', display:'block', marginBottom:'10px' }}>1. DESCARREGUE O BOLETO:</label>
                    <a href={tarefaSelecionada?.anexo_boleto} target="_blank" onClick={() => setFoiBaixado(true)} style={{ background: '#3b82f6', color: 'white', padding: '12px', borderRadius: '10px', textDecoration: 'none', display: 'block', textAlign:'center', fontWeight: 'bold' }}>⬇ BAIXAR ARQUIVO</a>
                    {foiBaixado && <p style={{color:'green', fontSize:'10px', marginTop:'8px'}}>✓ Download confirmado!</p>}
                  </div>
                )}

                {tarefaSelecionada?.status === 'vencido' && (
                  <div style={{ background: '#fef2f2', padding: '20px', borderRadius: '20px', border: '1px solid #ef4444' }}>
                    <label style={{ fontWeight: 'bold', fontSize:'12px', display:'block', marginBottom:'10px' }}>ANEXAR COMPROVANTE (OBRIGATÓRIO):</label>
                    <input type="file" onChange={e => setFileComprovante(e.target.files[0])} />
                  </div>
                )}

                <button onClick={handleAvanco} style={{ background: '#000', color: '#fff', padding: '18px', borderRadius: '15px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>CONCLUIR E AVANÇAR FLUXO ⮕</button>
                <button onClick={() => setTarefaSelecionada(null)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontWeight:'bold' }}>FECHAR</button>
              </div>
            </div>

            {/* CHAT INTEGRADO NO MODAL */}
            <div style={{ padding: '30px', background: '#f8fafc' }}>
              {userProfile && <ChatIntegrado chamadoId={tarefaSelecionada?.id} userProfile={userProfile} />}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}