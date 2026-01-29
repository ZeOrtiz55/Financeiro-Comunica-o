'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// --- COMPONENTE DE CHAT INTEGRADO (LADO DIREITO) ---
function ChatIntegrado({ chamadoId, userProfile }) {
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()

  useEffect(() => {
    if (!chamadoId) return
    // Histórico
    supabase.from('mensagens_chat').select('*').eq('chamado_id', chamadoId).order('created_at', { ascending: true })
      .then(({ data }) => data && setMensagens(data))

    // Realtime
    const channel = supabase.channel(`chat_kbn_${chamadoId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat', filter: `chamado_id=eq.${chamadoId}` }, 
        payload => { if (String(payload.new.usuario_id) !== String(userProfile.id)) setMensagens(prev => [...prev, payload.new]) }
      ).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [chamadoId, userProfile.id])

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [mensagens])

  const enviar = async (e) => {
    e.preventDefault()
    if (!novaMsg.trim()) return
    const texto = novaMsg; setNovaMsg('')
    setMensagens(prev => [...prev, { id: Date.now(), texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id }])
    await supabase.from('mensagens_chat').insert([{ texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id, chamado_id: chamadoId }])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '550px', borderLeft: '1px solid #eee', paddingLeft: '20px' }}>
      <h4 style={{ fontSize: '12px', color: '#166534', marginBottom: '10px' }}>CONVERSA DO CHAMADO</h4>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', background: '#f8fafc', borderRadius: '15px' }}>
        {mensagens.map(m => (
          <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile.id) ? '#22c55e' : 'white', color: String(m.usuario_id) === String(userProfile.id) ? 'white' : 'black', padding: '10px', borderRadius: '12px', fontSize: '11px', maxWidth: '85%', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <b style={{ fontSize: '8px', display: 'block' }}>{m.usuario_nome}</b>{m.texto}
          </div>
        ))}
      </div>
      <form onSubmit={enviar} style={{ display: 'flex', gap: '5px', paddingTop: '15px' }}>
        <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Tirar dúvida..." style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' }} />
        <button style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '12px', width: '45px', cursor: 'pointer' }}>➔</button>
      </form>
    </div>
  )
}

// --- PÁGINA KANBAN ---
export default function KanbanPage() {
  const [chamados, setChamados] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null)
  
  // Estados para as Travas de Regras
  const [fileBoleto, setFileBoleto] = useState(null)
  const [fileComprovante, setFileComprovante] = useState(null)
  const [foiBaixado, setFoiBaixado] = useState(false)

  const router = useRouter()

  const colunas = [
    { id: 'gerar_boleto', titulo: 'Gerar Boleto', cor: '#FEF3C7' },
    { id: 'enviar_cliente', titulo: 'Enviar ao Cliente', cor: '#DBEAFE' },
    { id: 'aguardando_vencimento', titulo: 'Aguardando Venc.', cor: '#F1F5F9' },
    { id: 'vencido', titulo: 'Vencido!', cor: '#FEE2E2' },
    { id: 'pago', titulo: 'Pago ✅', cor: '#DCFCE7' }
  ]

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/login')

      const { data: profile } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single()
      setUserProfile(profile)

      const { data } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido')
      
      // Lógica de verificação de vencimento automática no carregamento
      const hoje = new Date().toISOString().split('T')[0]
      const processados = (data || []).map(c => {
        if (c.status === 'aguardando_vencimento' && c.vencimento_boleto && c.vencimento_boleto < hoje) {
          return { ...c, status: 'vencido', tarefa: 'Cobrar Pagamento' }
        }
        return c
      })

      setChamados(processados)
      setLoading(false)
    }
    fetchData()
  }, [router])

  const handleAvancoFluxo = async () => {
    let updates = {}
    const status = tarefaSelecionada.status

    try {
      if (status === 'gerar_boleto') {
        if (!fileBoleto) return alert("TRAVA: Você deve anexar o boleto antes de avançar o card!")
        const path = `boletos/${Date.now()}-${fileBoleto.name}`
        await supabase.storage.from('anexos').upload(path, fileBoleto)
        const { data } = supabase.storage.from('anexos').getPublicUrl(path)
        updates = { status: 'enviar_cliente', tarefa: 'Enviar para Cliente', anexo_boleto: data.publicUrl }
      } 
      else if (status === 'enviar_cliente') {
        if (!foiBaixado) return alert("TRAVA: Você deve baixar o boleto antes de confirmar o envio!")
        updates = { status: 'aguardando_vencimento', tarefa: 'Aguardando Pagamento' }
      }
      else if (status === 'vencido') {
        if (!fileComprovante) return alert("TRAVA: Para liquidar, anexe o comprovante de pagamento!")
        const path = `comprovantes/${Date.now()}-${fileComprovante.name}`
        await supabase.storage.from('anexos').upload(path, fileComprovante)
        const { data } = supabase.storage.from('anexos').getPublicUrl(path)
        updates = { status: 'pago', tarefa: 'Pagamento Efetuado', comprovante_pagamento: data.publicUrl }
      } else {
          // Para fases sem travas (como aguardando_vencimento -> pago manual)
          updates = { status: 'pago', tarefa: 'Pagamento Efetuado' }
      }

      const { error } = await supabase.from('Chamado_NF').update(updates).eq('id', tarefaSelecionada.id)
      if (!error) window.location.reload()
    } catch (e) { alert("Erro: " + e.message) }
  }

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.45)',
    backdropFilter: 'blur(15px)',
    borderRadius: '25px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.05)'
  }

  if (loading) return <div style={{padding:'100px', textAlign:'center', fontWeight:'900'}}>CARREGANDO FLUXO...</div>

  return (
    <div style={{ padding: '20px', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <button onClick={() => router.push('/')} style={{ background: 'white', border: '1px solid #ddd', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>⬅ MINHAS TAREFAS</button>
        <h2 style={{ fontWeight: '900', color: '#14532d' }}>FLUXO NOTA FISCAL (KANBAN)</h2>
        <div style={{width:'150px'}}></div>
      </header>

      <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '20px', alignItems: 'flex-start' }}>
        {colunas.map(col => (
          <div key={col.id} style={{ minWidth: '270px', flex: 1 }}>
            <div style={{ background: col.cor, padding: '12px', borderRadius: '15px', marginBottom: '15px', textAlign: 'center', border: '1px solid rgba(0,0,0,0.05)' }}>
              <span style={{ fontWeight: '900', fontSize: '11px', textTransform: 'uppercase' }}>{col.titulo}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {chamados.filter(c => c.status === col.id).map(t => (
                <div key={t.id} onClick={() => { setTarefaSelecionada(t); setFoiBaixado(false); }} style={{ ...glassStyle, padding: '20px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', gap: '5px', marginBottom: '8px' }}>
                    {t.num_nf_servico && <span style={{ fontSize: '8px', fontWeight: '900', color: '#4338ca', background: '#eef2ff', padding: '2px 6px', borderRadius: '4px' }}>S: {t.num_nf_servico}</span>}
                    {t.num_nf_peca && <span style={{ fontSize: '8px', fontWeight: '900', color: '#c2410c', background: '#fff7ed', padding: '2px 6px', borderRadius: '4px' }}>P: {t.num_nf_peca}</span>}
                  </div>
                  <h3 style={{ margin: 0, fontWeight: '800', color: '#1e293b', fontSize: '14px' }}>{t.nom_cliente}</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', alignItems: 'center' }}>
                    <p style={{ margin: 0, fontWeight: '900', color: '#166534', fontSize: '15px' }}>R$ {t.valor_servico}</p>
                    {t.anexo_boleto && <span style={{fontSize:'12px'}}>📄</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL SPLIT: INFORMAÇÕES + CHAT EM TEMPO REAL */}
      {tarefaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '900px', borderRadius: '45px', display: 'grid', gridTemplateColumns: '1fr 380px', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.2)' }}>
            
            {/* LADO ESQUERDO: DETALHES E AÇÕES COM TRAVAS */}
            <div style={{ padding: '40px', overflowY: 'auto', maxHeight: '85vh' }}>
              <h2 style={{ fontWeight: '900', color: '#14532d', marginBottom: '5px' }}>{tarefaSelecionada.nom_cliente}</h2>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#22c55e', textTransform: 'uppercase', display: 'block', marginBottom: '25px' }}>{tarefaSelecionada.tarefa}</span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', fontSize: '14px' }}>
                <p><b>Valor:</b> R$ {tarefaSelecionada.valor_servico}</p>
                <p><b>Forma de Pagamento:</b> {tarefaSelecionada.forma_pagamento}</p>
                <p><b>Vencimento:</b> {tarefaSelecionada.vencimento_boleto || 'Imediato'}</p>
                <p><b>NF Serviço:</b> {tarefaSelecionada.num_nf_servico || '---'}</p>
                <p><b>NF Peças:</b> {tarefaSelecionada.num_nf_peca || '---'}</p>
                
                <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '10px 0' }} />

                {/* AREA DE AÇÕES DINÂMICAS E TRAVAS */}
                {tarefaSelecionada.status === 'gerar_boleto' && (
                  <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '25px', border: '1px solid #22c55e' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>ANEXAR BOLETO (OBRIGATÓRIO):</label>
                    <input type="file" onChange={e => setFileBoleto(e.target.files[0])} style={{fontSize:'12px'}} />
                  </div>
                )}

                {tarefaSelecionada.status === 'enviar_cliente' && (
                  <div style={{ background: '#eff6ff', padding: '20px', borderRadius: '25px', border: '1px solid #3b82f6' }}>
                    <p style={{fontSize:'12px', fontWeight:'bold', marginBottom:'10px'}}>1. BAIXE O BOLETO PARA ENVIAR:</p>
                    <a href={tarefaSelecionada.anexo_boleto} target="_blank" onClick={() => setFoiBaixado(true)} style={{ background: '#3b82f6', color: 'white', padding: '12px 20px', borderRadius: '15px', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block', textAlign:'center' }}>⬇ BAIXAR ARQUIVO</a>
                    {foiBaixado && <p style={{color:'green', fontSize:'11px', marginTop:'10px'}}>✓ Download confirmado. Pode avançar.</p>}
                  </div>
                )}

                {tarefaSelecionada.status === 'vencido' && (
                  <div style={{ background: '#fef2f2', padding: '20px', borderRadius: '25px', border: '1px solid #ef4444' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>ANEXAR COMPROVANTE (OBRIGATÓRIO):</label>
                    <input type="file" onChange={e => setFileComprovante(e.target.files[0])} style={{fontSize:'12px'}} />
                  </div>
                )}

                <button onClick={handleAvancoFluxo} style={{ background: 'black', color: 'white', border: 'none', padding: '18px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
                  SALVAR E AVANÇAR FLUXO ⮕
                </button>
                <button onClick={() => setTarefaSelecionada(null)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontWeight:'bold' }}>VOLTAR AO FLUXO</button>
              </div>
            </div>

            {/* LADO DIREITO: CHAT INTEGRADO */}
            <div style={{ background: '#f8fafc', padding: '30px' }}>
              <ChatIntegrado chamadoId={tarefaSelecionada.id} userProfile={userProfile} />
            </div>

          </div>
        </div>
      )}
    </div>
  )
}