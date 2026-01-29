'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// --- COMPONENTE DE CHAT (LADO DIREITO DO MODAL) ---
function ChatIntegrado({ chamadoId, userProfile }) {
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()

  useEffect(() => {
    if (!chamadoId) return
    supabase.from('mensagens_chat').select('*').eq('chamado_id', chamadoId).order('created_at', { ascending: true })
      .then(({ data }) => data && setMensagens(data))

    const channel = supabase.channel(`chat_${chamadoId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat', filter: `chamado_id=eq.${chamadoId}` }, 
        payload => { if (String(payload.new.usuario_id) !== String(userProfile.id)) setMensagens(prev => [...prev, payload.new]) }
      ).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [chamadoId])

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [mensagens])

  const enviar = async (e) => {
    e.preventDefault()
    if (!novaMsg.trim()) return
    const texto = novaMsg; setNovaMsg('')
    setMensagens(prev => [...prev, { id: Date.now(), texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id }])
    await supabase.from('mensagens_chat').insert([{ texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id, chamado_id: chamadoId }])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '500px', borderLeft: '1px solid #eee', paddingLeft: '20px' }}>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px' }}>
        {mensagens.map(m => (
          <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile.id) ? '#22c55e' : '#f1f5f9', color: String(m.usuario_id) === String(userProfile.id) ? 'white' : 'black', padding: '10px', borderRadius: '12px', fontSize: '12px', maxWidth: '85%' }}>
            <b style={{ fontSize: '8px', display: 'block' }}>{m.usuario_nome}</b>{m.texto}
          </div>
        ))}
      </div>
      <form onSubmit={enviar} style={{ display: 'flex', gap: '5px', paddingTop: '10px' }}>
        <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Tirar dúvida..." style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #ddd' }} />
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
  
  // Estados de Validação
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
      
      const { data: chamados } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido')
      const filtradas = (chamados || []).filter(t => {
        if (prof?.funcao === 'Financeiro') return t.status === 'gerar_boleto'
        if (prof?.funcao === 'Pós-Vendas') return t.status === 'enviar_cliente' || t.status === 'vencido'
        return false
      })
      setTarefas(filtradas)
      setLoading(false)
    }
    carregar()
  }, [])

  const handleAvanco = async () => {
    let updates = {}
    const status = tarefaSelecionada.status

    if (status === 'gerar_boleto') {
      if (!fileBoleto) return alert("ERRO: Anexe o boleto para o card sair do Financeiro!")
      const path = `boletos/${Date.now()}-${fileBoleto.name}`
      await supabase.storage.from('anexos').upload(path, fileBoleto)
      const { data } = supabase.storage.from('anexos').getPublicUrl(path)
      updates = { status: 'enviar_cliente', tarefa: 'Enviar para Cliente', anexo_boleto: data.publicUrl }
    } 
    else if (status === 'enviar_cliente') {
      if (!foiBaixado) return alert("ERRO: Baixe o boleto antes de confirmar o envio!")
      updates = { status: 'aguardando_vencimento', tarefa: 'Aguardando Pagamento' }
    }
    else if (status === 'vencido') {
      if (!fileComprovante) return alert("ERRO: Anexe o comprovante para liquidar o vencido!")
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
      <header style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(10px)', padding: '20px', borderRadius: '30px', display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
        <div style={{display:'flex', gap:'15px'}}>
           <div style={{width:'40px', height:'40px', background:'#22c55e', borderRadius:'10px'}}></div>
           <div><b>{userProfile?.nome}</b><p style={{margin:0, fontSize:'10px'}}>{userProfile?.funcao}</p></div>
        </div>
        <button onClick={() => router.push('/kanban')} style={{padding:'10px 20px', borderRadius:'10px', border:'none', background:'#000', color:'#fff', fontWeight:'bold', cursor:'pointer'}}>📊 FLUXO KANBAN</button>
      </header>

      {/* LISTA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {tarefas.map(t => (
          <div key={t.id} onClick={() => {setTarefaSelecionada(t); setFoiBaixado(false)}} style={{ background: 'white', padding: '20px', borderRadius: '20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
            <span><b>{t.nom_cliente}</b> - {t.tarefa}</span>
            <b style={{color:'#22c55e'}}>R$ {t.valor_servico}</b>
          </div>
        ))}
      </div>

      {/* MODAL SPLIT (DETALHES + CHAT) */}
      {tarefaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '900px', borderRadius: '40px', display: 'grid', gridTemplateColumns: '1fr 350px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            
            {/* ESQUERDA: DETALHES E REGRAS */}
            <div style={{ padding: '40px', overflowY: 'auto', maxHeight: '80vh' }}>
              <h2 style={{ color: '#14532d', margin: '0 0 20px 0' }}>{tarefaSelecionada.nom_cliente}</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <p><b>Fase Atual:</b> {tarefaSelecionada.status.toUpperCase()}</p>
                <p><b>Valor:</b> R$ {tarefaSelecionada.valor_servico}</p>
                
                {/* REGRAS DINÂMICAS */}
                {tarefaSelecionada.status === 'gerar_boleto' && (
                  <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '20px', border: '1px solid #22c55e' }}>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>ANEXAR BOLETO:</label>
                    <input type="file" onChange={e => setFileBoleto(e.target.files[0])} />
                  </div>
                )}

                {tarefaSelecionada.status === 'enviar_cliente' && (
                  <div style={{ background: '#eff6ff', padding: '20px', borderRadius: '20px', border: '1px solid #3b82f6' }}>
                    <p>Baixe o arquivo para poder avançar:</p>
                    <a href={tarefaSelecionada.anexo_boleto} target="_blank" onClick={() => setFoiBaixado(true)} style={{ background: '#3b82f6', color: 'white', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', display: 'inline-block', fontWeight: 'bold' }}>⬇ BAIXAR BOLETO</a>
                  </div>
                )}

                {tarefaSelecionada.status === 'vencido' && (
                  <div style={{ background: '#fef2f2', padding: '20px', borderRadius: '20px', border: '1px solid #ef4444' }}>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>ANEXAR COMPROVANTE:</label>
                    <input type="file" onChange={e => setFileComprovante(e.target.files[0])} />
                  </div>
                )}

                <button onClick={handleAvanco} style={{ background: '#000', color: '#fff', padding: '18px', borderRadius: '15px', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>SALVAR E AVANÇAR PROCESSO ⮕</button>
                <button onClick={() => setTarefaSelecionada(null)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer' }}>VOLTAR</button>
              </div>
            </div>

            {/* DIREITA: CHAT */}
            <div style={{ padding: '30px', background: '#f8fafc' }}>
              <ChatIntegrado chamadoId={tarefaSelecionada.id} userProfile={userProfile} />
            </div>

          </div>
        </div>
      )}
    </div>
  )
}