'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// --- CHAT INTEGRADO (IGUAL AO DA HOME) ---
function ChatChamado({ chamadoId, userProfile }) {
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()
  useEffect(() => {
    if (!chamadoId || !userProfile?.id) return
    supabase.from('mensagens_chat').select('*').eq('chamado_id', chamadoId).order('created_at', { ascending: true }).then(({ data }) => data && setMensagens(data))
    const channel = supabase.channel(`chat_kbn_${chamadoId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat', filter: `chamado_id=eq.${chamadoId}` }, 
      payload => { if (String(payload.new.usuario_id) !== String(userProfile.id)) setMensagens(prev => [...prev, payload.new]) }
    ).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [chamadoId, userProfile?.id])
  const enviar = async (e) => {
    e.preventDefault(); if (!novaMsg.trim()) return
    const t = novaMsg; setNovaMsg(''); setMensagens(p => [...p, { id: Date.now(), texto: t, usuario_nome: userProfile.nome, usuario_id: userProfile.id }])
    await supabase.from('mensagens_chat').insert([{ texto: t, usuario_nome: userProfile.nome, usuario_id: userProfile.id, chamado_id: chamadoId }])
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '1px solid #eee', paddingLeft: '20px' }}>
      <h4 style={{ fontSize: '12px', color: '#166534', marginBottom: '10px' }}>CONVERSA</h4>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: '#f8fafc', borderRadius: '15px' }}>
        {mensagens.map(m => ( <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile.id) ? '#22c55e' : 'white', color: String(m.usuario_id) === String(userProfile.id) ? 'white' : 'black', padding: '10px', borderRadius: '12px', fontSize: '11px' }}>{m.texto}</div> ))}
      </div>
      <form onSubmit={enviar} style={{ display: 'flex', gap: '5px', paddingTop: '15px' }}>
        <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="..." style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #ddd' }} />
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
      const { data } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido')
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

  if (loading) return <div style={{padding:'100px', textAlign:'center'}}>Carregando...</div>

  return (
    <div style={{ padding: '20px', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <button onClick={() => router.push('/')} style={{ marginBottom: '20px', padding: '10px 20px', borderRadius: '12px', border: '1px solid #ddd', cursor: 'pointer', background: 'white', fontWeight:'bold' }}>⬅ VOLTAR</button>
      <div style={{ display: 'flex', gap: '15px', overflowX: 'auto' }}>
        {colunas.map(col => (
          <div key={col.id} style={{ minWidth: '270px', flex: 1 }}>
            <div style={{ background: col.cor, padding: '12px', borderRadius: '15px', marginBottom: '15px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px' }}>{col.titulo}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {chamados.filter(c => c.status === col.id).map(t => (
                <div key={t.id} onClick={() => setTarefaSelecionada(t)} style={{ background: 'white', padding: '20px', borderRadius: '25px', cursor: 'pointer', border: '1px solid #eee' }}>
                  <h4 style={{ margin: 0, fontSize: '14px' }}>{t.nom_cliente}</h4>
                  <p style={{ margin: '8px 0 0 0', fontWeight: 'bold', color: '#166534', fontSize: '13px' }}>R$ {t.valor_servico}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {tarefaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '950px', borderRadius: '40px', display: 'grid', gridTemplateColumns: '1fr 380px', overflow: 'hidden' }}>
            <div style={{ padding: '40px', overflowY: 'auto', maxHeight: '85vh' }}>
              <h2 style={{ color: '#14532d' }}>{tarefaSelecionada.nom_cliente}</h2>
              <p style={{marginTop:'20px'}}><b>Valor:</b> R$ {tarefaSelecionada.valor_servico}</p>
              <p><b>Status:</b> {tarefaSelecionada.status.toUpperCase()}</p>
              <button onClick={() => setTarefaSelecionada(null)} style={{ background: '#000', color: '#fff', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: 'bold', width: '100%', marginTop: '30px', cursor: 'pointer' }}>FECHAR</button>
            </div>
            <div style={{ padding: '30px', background: '#f8fafc' }}>
              {userProfile && <ChatChamado chamadoId={tarefaSelecionada.id} userProfile={userProfile} />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}