'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// --- CHAT DO CARD (LADO DIREITO DO MODAL) ---
function ChatChamado({ chamadoId, userProfile }) {
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()

  useEffect(() => {
    if (!chamadoId || !userProfile?.id) return
    supabase.from('mensagens_chat').select('*').eq('chamado_id', chamadoId).order('created_at', { ascending: true })
      .then(({ data }) => data && setMensagens(data))

    const channel = supabase.channel(`chat_kbn_${chamadoId}`).on('postgres_changes', { 
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
    const t = novaMsg; setNovaMsg('')
    setMensagens(p => [...p, { id: Date.now(), texto: t, usuario_nome: userProfile.nome, usuario_id: userProfile.id }])
    await supabase.from('mensagens_chat').insert([{ texto: t, usuario_nome: userProfile.nome, usuario_id: userProfile.id, chamado_id: chamadoId }])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '1px solid #eee', paddingLeft: '20px' }}>
      <h4 style={{ fontSize: '11px', color: '#166534', marginBottom: '10px', fontWeight:'900' }}>CONVERSA DO PROCESSO</h4>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: '#f8fafc', borderRadius: '15px' }}>
        {mensagens.map(m => ( 
          <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile.id) ? '#22c55e' : '#fff', color: String(m.usuario_id) === String(userProfile.id) ? '#fff' : '#000', padding: '10px', borderRadius: '12px', fontSize: '11px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <b style={{fontSize:'8px', display:'block', opacity: 0.6}}>{m.usuario_nome}</b>{m.texto}
          </div> 
        ))}
      </div>
      <form onSubmit={enviar} style={{ display: 'flex', gap: '5px', paddingTop: '15px' }}>
        <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Tirar dúvida..." style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '12px' }} />
        <button style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '10px', padding: '10px' }}>➔</button>
      </form>
    </div>
  )
}

export default function KanbanPage() {
  const [chamados, setChamados] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/login')
      const { data: prof } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single()
      setUserProfile(prof)
      const { data } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido').order('id', {ascending: false})
      setChamados(data || [])
      setLoading(false)
    }
    fetchData()
  }, [router])

  const colunas = [
    { id: 'gerar_boleto', titulo: 'Gerar Boleto', cor: '#FEF3C7' },
    { id: 'enviar_cliente', titulo: 'Enviar Cliente', cor: '#DBEAFE' },
    { id: 'aguardando_vencimento', titulo: 'Aguardando Pag.', cor: '#F1F5F9' },
    { id: 'vencido', titulo: 'Vencido!', cor: '#FEE2E2' },
    { id: 'pago', titulo: 'Pago ✅', cor: '#DCFCE7' }
  ]

  const glassStyle = { background: 'white', padding: '20px', borderRadius: '25px', cursor: 'pointer', border: '1px solid #eee', boxShadow: '0 4px 10px rgba(0,0,0,0.02)', transition: '0.3s' }

  if (loading) return <div style={{padding:'100px', textAlign:'center', fontWeight:'bold'}}>Carregando Fluxo...</div>

  return (
    <div style={{ padding: '20px', minHeight: '100vh', fontFamily: 'sans-serif', background: '#f9f9f9' }}>
      
      <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px' }}>
        <button onClick={() => router.push('/')} style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid #ddd', cursor: 'pointer', background: 'white', fontWeight:'bold', fontSize:'12px' }}>⬅ VOLTAR PARA TAREFAS</button>
        <h2 style={{fontWeight:'900', color:'#14532d', margin:0}}>FLUXO NOTA FISCAL</h2>
        <div style={{width:'150px'}}></div>
      </header>

      <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', alignItems: 'flex-start', paddingBottom:'20px' }}>
        {colunas.map(col => (
          <div key={col.id} style={{ minWidth: '280px', flex: 1 }}>
            <div style={{ background: col.cor, padding: '15px', borderRadius: '15px', marginBottom: '15px', textAlign: 'center', fontWeight: '900', fontSize: '12px', color: '#1e293b', border:'1px solid rgba(0,0,0,0.05)' }}>{col.titulo.toUpperCase()}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {chamados.filter(c => c.status === col.id).map(t => (
                <div key={t.id} onClick={() => setTarefaSelecionada(t)} style={glassStyle} onMouseEnter={e => e.currentTarget.style.borderColor = '#22c55e'} onMouseLeave={e => e.currentTarget.style.borderColor = '#eee'}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                    <b style={{fontSize:'12px', color:'#166534', background:'#f0fdf4', padding:'2px 6px', borderRadius:'5px'}}>#{t.id}</b>
                    {(t.num_nf_servico || t.num_nf_peca) && <span style={{fontSize:'10px'}}>📎</span>}
                  </div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight:'800', color:'#1e293b' }}>{t.nom_cliente}</h4>
                  <p style={{ margin: '10px 0 0 0', fontWeight: 'bold', color: '#166534', fontSize: '16px' }}>R$ {t.valor_servico}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DETALHE COMPLETO + CHAT */}
      {tarefaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '1000px', borderRadius: '45px', display: 'grid', gridTemplateColumns: '1fr 380px', overflow: 'hidden', boxShadow: '0 30px 70px rgba(0,0,0,0.3)' }}>
            
            {/* LADO ESQUERDO: TODAS AS INFORMAÇÕES */}
            <div style={{ padding: '45px', overflowY: 'auto', maxHeight: '85vh' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                 <b style={{ fontSize: '20px', color: '#166534', background: '#f0fdf4', padding: '5px 15px', borderRadius: '12px' }}>#{tarefaSelecionada.id}</b>
                 <h2 style={{ color: '#14532d', margin: 0, fontSize:'28px', fontWeight:'900' }}>{tarefaSelecionada.nom_cliente}</h2>
              </div>
              <p style={{fontSize:'13px', color:'#22c55e', fontWeight:'bold', letterSpacing:'1px', marginBottom:'30px'}}>{tarefaSelecionada.status?.toUpperCase()}</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background:'#f8fafc', padding:'25px', borderRadius:'25px', fontSize:'14px' }}>
                 <div><label style={{fontSize:'10px', color:'#999', fontWeight:'bold', display:'block', marginBottom:'4px'}}>VALOR TOTAL</label><b>R$ {tarefaSelecionada.valor_servico}</b></div>
                 <div><label style={{fontSize:'10px', color:'#999', fontWeight:'bold', display:'block', marginBottom:'4px'}}>PAGAMENTO</label><b>{tarefaSelecionada.forma_pagamento}</b></div>
                 <div><label style={{fontSize:'10px', color:'#999', fontWeight:'bold', display:'block', marginBottom:'4px'}}>NF SERVIÇO</label><b>{tarefaSelecionada.num_nf_servico || '---'}</b></div>
                 <div><label style={{fontSize:'10px', color:'#999', fontWeight:'bold', display:'block', marginBottom:'4px'}}>NF PEÇAS</label><b>{tarefaSelecionada.num_nf_peca || '---'}</b></div>
                 <div><label style={{fontSize:'10px', color:'#999', fontWeight:'bold', display:'block', marginBottom:'4px'}}>VENCIMENTO</label><b>{tarefaSelecionada.vencimento_boleto || 'Imediato'}</b></div>
                 <div><label style={{fontSize:'10px', color:'#999', fontWeight:'bold', display:'block', marginBottom:'4px'}}>SETOR ORIGEM</label><b>{tarefaSelecionada.setor || 'Não informado'}</b></div>
              </div>

              {tarefaSelecionada.obs && (
                <div style={{ marginTop: '20px', background:'#fffbeb', padding:'20px', borderRadius:'20px', border:'1px solid #fef3c7' }}>
                  <label style={{fontSize:'10px', color:'#d97706', fontWeight:'bold', display:'block', marginBottom:'5px'}}>OBSERVAÇÕES:</label>
                  <p style={{margin:0, fontSize:'13px', lineHeight:'1.5'}}>{tarefaSelecionada.obs}</p>
                </div>
              )}

              {/* BOTÕES DE ARQUIVOS (SE EXISTIREM) */}
              <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap:'wrap' }}>
                {tarefaSelecionada.anexo_nf_servico && <a href={tarefaSelecionada.anexo_nf_servico} target="_blank" style={{ background:'#eff6ff', color:'#1d4ed8', padding:'10px 15px', borderRadius:'10px', fontSize:'11px', fontWeight:'bold', textDecoration:'none' }}>📄 VER O.S.</a>}
                {tarefaSelecionada.anexo_nf_peca && <a href={tarefaSelecionada.anexo_nf_peca} target="_blank" style={{ background:'#eff6ff', color:'#1d4ed8', padding:'10px 15px', borderRadius:'10px', fontSize:'11px', fontWeight:'bold', textDecoration:'none' }}>⚙️ VER NOTA PEÇAS</a>}
                {tarefaSelecionada.anexo_boleto && <a href={tarefaSelecionada.anexo_boleto} target="_blank" style={{ background:'#f0fdf4', color:'#166534', padding:'10px 15px', borderRadius:'10px', fontSize:'11px', fontWeight:'bold', textDecoration:'none' }}>💰 VER BOLETO</a>}
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
    </div>
  )
}