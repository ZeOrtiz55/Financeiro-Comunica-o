'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// --- COMPONENTE DE CHAT INTERNO ---
function ChatFlutuante({ userProfile }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()

  useEffect(() => {
    const channel = supabase
      .channel('chat_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat' }, 
        payload => setMensagens(prev => [...prev, payload.new])
      ).subscribe()

    supabase.from('mensagens_chat').select('*').order('created_at', { ascending: true }).limit(50)
      .then(({ data }) => data && setMensagens(data))

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [mensagens, isOpen])

  const enviarMsg = async (e) => {
    e.preventDefault()
    if (!novaMsg.trim()) return
    await supabase.from('mensagens_chat').insert([{ texto: novaMsg, usuario_nome: userProfile.nome, usuario_id: userProfile.id }])
    setNovaMsg('')
  }

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 1000 }}>
      <button onClick={() => setIsOpen(!isOpen)} style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#22c55e', color: 'white', border: 'none', fontSize: '24px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>{isOpen ? '✕' : '💬'}</button>
      {isOpen && (
        <div style={{ position: 'absolute', bottom: '80px', right: 0, width: '320px', height: '400px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderRadius: '25px', display: 'flex', flexDirection: 'column', border: '1px solid #ddd', overflow: 'hidden' }}>
          <div style={{ padding: '15px', background: '#22c55e', color: 'white', fontSize: '13px', fontWeight: 'bold' }}>Chat Nova Tratores</div>
          <div ref={scrollRef} style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {mensagens.map(m => (
              <div key={m.id} style={{ alignSelf: m.usuario_id === userProfile.id ? 'flex-end' : 'flex-start', background: m.usuario_id === userProfile.id ? '#22c55e' : '#eee', color: m.usuario_id === userProfile.id ? 'white' : 'black', padding: '8px 12px', borderRadius: '12px', fontSize: '11px' }}>
                <b style={{ fontSize: '8px', display: 'block' }}>{m.usuario_nome}</b>{m.texto}
              </div>
            ))}
          </div>
          <form onSubmit={enviarMsg} style={{ padding: '10px', display: 'flex', gap: '5px', borderTop: '1px solid #eee' }}>
            <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Dúvida..." style={{ flex: 1, border: '1px solid #ddd', borderRadius: '8px', padding: '5px 10px', fontSize: '12px' }} />
            <button style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', padding: '5px 10px' }}>➔</button>
          </form>
        </div>
      )}
    </div>
  )
}

// --- PÁGINA PRINCIPAL ---
export default function Home() {
  const [tarefas, setTarefas] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null)
  const [isSelecaoOpen, setIsSelecaoOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  
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
  }, [router])

  const upload = async (file, folder) => {
    const path = `${folder}/${Date.now()}-${file.name}`
    await supabase.storage.from('anexos').upload(path, file)
    const { data } = supabase.storage.from('anexos').getPublicUrl(path)
    return data.publicUrl
  }

  const handleAvanco = async () => {
    try {
      let updates = {}
      if (tarefaSelecionada.status === 'gerar_boleto') {
        if (!fileBoleto) return alert("TRAVA: Anexe o boleto!")
        const url = await upload(fileBoleto, 'boletos')
        updates = { status: 'enviar_cliente', tarefa: 'Enviar para Cliente', anexo_boleto: url }
      } else if (tarefaSelecionada.status === 'enviar_cliente') {
        if (!foiBaixado) return alert("TRAVA: Baixe o boleto antes de confirmar!")
        updates = { status: 'aguardando_vencimento', tarefa: 'Aguardando Pagamento' }
      } else if (tarefaSelecionada.status === 'vencido') {
        if (!fileComprovante) return alert("TRAVA: Anexe o comprovante de pagamento!")
        const url = await upload(fileComprovante, 'comprovantes')
        updates = { status: 'pago', tarefa: 'Pagamento Efetuado', comprovante_pagamento: url }
      }

      const { error } = await supabase.from('Chamado_NF').update(updates).eq('id', tarefaSelecionada.id)
      if (!error) window.location.reload()
    } catch (e) { alert(e.message) }
  }

  const glassStyle = { background: 'rgba(255, 255, 255, 0.45)', backdropFilter: 'blur(15px)', border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: '35px' }

  if (loading) return <div style={{padding:'100px', textAlign:'center', fontWeight:'bold'}}>Carregando...</div>

  return (
    <div style={{ padding: '30px 20px', maxWidth: '850px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      <header style={{ ...glassStyle, padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '45px', height: '45px', background: '#22c55e', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>{userProfile?.nome?.charAt(0)}</div>
          <div>
            <h1 style={{ fontSize: '14px', margin: 0 }}>{userProfile?.nome}</h1>
            <p style={{ fontSize: '10px', color: '#166534', fontWeight: 'bold' }}>{userProfile?.funcao?.toUpperCase()}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => router.push('/kanban')} style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #dcfce7', padding: '10px 15px', borderRadius: '12px', fontWeight: '900', fontSize: '10px', cursor:'pointer' }}>📊 FLUXO NF</button>
          <button onClick={() => setIsSettingsOpen(true)} style={{ background: '#f1f5f9', border: 'none', padding: '10px', borderRadius: '12px', cursor:'pointer' }}>⚙️</button>
          <button onClick={() => setIsSelecaoOpen(true)} style={{ background: '#22c55e', color: 'white', padding: '10px 20px', borderRadius: '12px', border: 'none', fontWeight:'bold', cursor:'pointer' }}>+ NOVO</button>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} style={{ background:'none', border:'none', color:'#B91C1C', fontWeight:'bold', fontSize:'11px', cursor:'pointer' }}>SAIR</button>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#14532d' }}>Fila: {userProfile?.funcao}</h2>
        {tarefas.map(t => (
          <div key={t.id} onClick={() => { setTarefaSelecionada(t); setFoiBaixado(false); }} style={{ ...glassStyle, padding: '25px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', gap: '5px', marginBottom: '8px' }}>
                <span style={{ fontSize: '8px', fontWeight: '900', color: t.status === 'vencido' ? '#B91C1C' : '#166534', background: t.status === 'vencido' ? '#fee2e2' : 'rgba(34,197,94,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{t.tarefa.toUpperCase()}</span>
                {t.num_nf_servico && <span style={{ fontSize: '8px', fontWeight: '900', color: '#4338ca', background: '#eef2ff', padding: '2px 6px', borderRadius: '4px' }}>S: {t.num_nf_servico}</span>}
                {t.num_nf_peca && <span style={{ fontSize: '8px', fontWeight: '900', color: '#c2410c', background: '#fff7ed', padding: '2px 6px', borderRadius: '4px' }}>P: {t.num_nf_peca}</span>}
              </div>
              <h3 style={{ margin: 0, fontWeight: '800' }}>{t.nom_cliente}</h3>
            </div>
            <p style={{ fontWeight: '900', fontSize: '20px', color: '#166534' }}>R$ {t.valor_servico}</p>
          </div>
        ))}
        {tarefas.length === 0 && <p style={{textAlign:'center', color:'#999', marginTop: '20px'}}>Nenhuma tarefa para seu setor. ✨</p>}
      </div>

      {tarefaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '45px', width: '100%', maxWidth: '500px' }}>
            <h3 style={{ fontWeight: '900', color: '#14532d' }}>{tarefaSelecionada.nom_cliente}</h3>
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#22c55e', textTransform: 'uppercase', marginBottom: '20px' }}>{tarefaSelecionada.tarefa}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {tarefaSelecionada.status === 'gerar_boleto' && (
                <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '20px', border: '1px solid #22c55e' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>ANEXAR BOLETO (OBRIGATÓRIO):</label>
                  <input type="file" onChange={e => setFileBoleto(e.target.files[0])} />
                </div>
              )}

              {tarefaSelecionada.status === 'enviar_cliente' && (
                <div style={{ background: '#eff6ff', padding: '20px', borderRadius: '20px', border: '1px solid #3b82f6' }}>
                  <a href={tarefaSelecionada.anexo_boleto} target="_blank" onClick={() => setFoiBaixado(true)} style={{ background: '#3b82f6', color: 'white', padding: '12px 20px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block' }}>⬇ BAIXAR BOLETO</a>
                  {foiBaixado && <p style={{color:'green', fontSize:'11px', marginTop:'10px'}}>✓ Download realizado.</p>}
                </div>
              )}

              {tarefaSelecionada.status === 'vencido' && (
                <div style={{ background: '#fef2f2', padding: '20px', borderRadius: '20px', border: '1px solid #ef4444' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>ANEXAR COMPROVANTE (OBRIGATÓRIO):</label>
                  <input type="file" onChange={e => setFileComprovante(e.target.files[0])} />
                </div>
              )}

              <button onClick={handleAvanco} style={{ background: 'black', color: 'white', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' }}>CONFIRMAR E AVANÇAR ⮕</button>
              <button onClick={() => setTarefaSelecionada(null)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontWeight: 'bold' }}>CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '40px', width: '90%', maxWidth: '400px' }}>
            <h3 style={{ fontWeight: '900', marginBottom: '20px' }}>Meu Perfil</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input style={{ padding: '12px', borderRadius: '12px', border: '1px solid #ddd' }} defaultValue={userProfile?.nome} id="n_nome" placeholder="Nome" />
              <select style={{ padding: '12px', borderRadius: '12px', border: '1px solid #ddd' }} defaultValue={userProfile?.funcao} id="n_fun">
                <option value="Financeiro">Financeiro</option>
                <option value="Pós-Vendas">Pós-Vendas</option>
              </select>
              <button onClick={async () => {
                const n = document.getElementById('n_nome').value; const f = document.getElementById('n_fun').value;
                await supabase.from('financeiro_usu').update({ nome: n, funcao: f }).eq('id', userProfile.id)
                window.location.reload()
              }} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: 'bold' }}>SALVAR</button>
              <button onClick={() => setIsSettingsOpen(false)} style={{ background: 'none', border: 'none', color: '#999' }}>FECHAR</button>
            </div>
          </div>
        </div>
      )}

      {userProfile && <ChatFlutuante userProfile={userProfile} />}
    </div>
  )
}