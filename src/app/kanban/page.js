'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// --- MESMO CHAT DA HOME ---
function ChatIntegrado({ chamadoId, userProfile }) {
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()
  useEffect(() => {
    if (!chamadoId || !userProfile?.id) return
    supabase.from('mensagens_chat').select('*').eq('chamado_id', chamadoId).order('created_at', { ascending: true }).then(({ data }) => data && setMensagens(data))
    const channel = supabase.channel(`kchat_${chamadoId}`).on('postgres_changes', { event:'INSERT', schema:'public', table:'mensagens_chat', filter:`chamado_id=eq.${chamadoId}` }, 
    payload => { if (String(payload.new.usuario_id) !== String(userProfile?.id)) setMensagens(p => [...p, payload.new]) }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [chamadoId])
  const enviar = async (e) => {
    e.preventDefault(); if(!novaMsg.trim() || !userProfile?.id) return
    const texto = novaMsg; setNovaMsg(''); setMensagens(p => [...p, {id: Date.now(), texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id}])
    await supabase.from('mensagens_chat').insert([{ texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id, chamado_id: chamadoId }])
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '500px', borderLeft: '1px solid #eee', paddingLeft: '20px' }}>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {mensagens.map(m => (
          <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile?.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile?.id) ? '#22c55e' : '#f1f5f9', color: String(m.usuario_id) === String(userProfile?.id) ? 'white' : 'black', padding: '10px', borderRadius: '12px', fontSize: '11px' }}>{m.texto}</div>
        ))}
      </div>
      <form onSubmit={enviar} style={{ display:'flex', gap:'5px', paddingTop:'10px' }}><input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Chat..." style={{flex:1, padding:'10px', borderRadius:'10px', border:'1px solid #ddd'}} /><button style={{background:'#22c55e', border:'none', color:'#fff', borderRadius:'10px', padding:'0 15px'}}>➔</button></form>
    </div>
  )
}

export default function KanbanPage() {
  const [chamados, setChamados] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const colunas = [
    { id: 'gerar_boleto', titulo: 'Gerar Boleto', cor: '#FEF3C7' },
    { id: 'enviar_cliente', titulo: 'Enviar Cliente', cor: '#DBEAFE' },
    { id: 'aguardando_vencimento', titulo: 'Em Aberto', cor: '#F1F5F9' },
    { id: 'vencido', titulo: 'Vencido!', cor: '#FEE2E2' },
    { id: 'pago', titulo: 'Pago ✅', cor: '#DCFCE7' }
  ]

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/login')
      const { data: prof } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single()
      setUserProfile(prof)
      const { data } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido')
      setChamados(data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return <div style={{padding:'100px', textAlign:'center'}}>Carregando Kanban...</div>

  return (
    <div style={{ padding: '20px', minHeight: '100vh', fontFamily: 'sans-serif', background:'#f8fafc' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
        <button onClick={() => router.push('/')} style={{ background: 'white', border: '1px solid #ddd', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>⬅ VOLTAR</button>
        <h2 style={{ fontWeight: '900', color: '#14532d' }}>FLUXO NOTA FISCAL</h2>
        <div style={{width:'100px'}}></div>
      </header>

      <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', alignItems: 'flex-start' }}>
        {colunas.map(col => (
          <div key={col.id} style={{ minWidth: '260px', flex: 1 }}>
            <div style={{ background: col.cor, padding: '12px', borderRadius: '15px', marginBottom: '15px', textAlign: 'center', fontWeight:'bold', fontSize:'11px' }}>{col.titulo}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {chamados.filter(c => c.status === col.id).map(t => (
                <div key={t.id} onClick={() => setTarefaSelecionada(t)} style={{ background: 'white', padding: '15px', borderRadius: '20px', cursor: 'pointer', border:'1px solid #eee' }}>
                  <h4 style={{ margin: 0, fontSize: '13px' }}>{t.nom_cliente}</h4>
                  <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', color: '#166534', fontSize:'12px' }}>R$ {t.valor_servico}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {tarefaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '900px', borderRadius: '40px', display: 'grid', gridTemplateColumns: '1fr 350px', overflow: 'hidden' }}>
            <div style={{ padding: '40px', overflowY: 'auto', maxHeight: '85vh' }}>
              <h2 style={{ color: '#14532d', margin: 0 }}>{tarefaSelecionada?.nom_cliente}</h2>
              <p style={{marginTop:'20px'}}><b>Valor:</b> R$ {tarefaSelecionada?.valor_servico}</p>
              <p><b>NF Serviço:</b> {tarefaSelecionada?.num_nf_servico || '---'}</p>
              <p><b>NF Peças:</b> {tarefaSelecionada?.num_nf_peca || '---'}</p>
              <p><b>Pagamento:</b> {tarefaSelecionada?.forma_pagamento}</p>
              <button onClick={() => setTarefaSelecionada(null)} style={{ background: '#000', color: '#fff', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: 'bold', width: '100%', marginTop: '20px', cursor:'pointer' }}>FECHAR DETALHES</button>
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