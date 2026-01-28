'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// --- COMPONENTE DE CHAT COM REALTIME ---
function ChatFlutuante({ userProfile }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()

  useEffect(() => {
    // Inscreve no Realtime do Supabase
    const channel = supabase
      .channel('chat_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat' }, 
        payload => {
          setMensagens(prev => {
            // Evita duplicar se a mensagem já foi adicionada pelo "update otimista"
            const jaExiste = prev.find(m => m.id === payload.new.id)
            return jaExiste ? prev : [...prev, payload.new]
          })
        }
      ).subscribe()

    // Busca histórico inicial
    supabase.from('mensagens_chat').select('*').order('created_at', { ascending: true }).limit(50)
      .then(({ data }) => data && setMensagens(data))

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Auto-scroll para o fim da conversa
  useEffect(() => { 
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight 
  }, [mensagens, isOpen])

  const enviarMsg = async (e) => {
    e.preventDefault()
    if (!novaMsg.trim()) return

    const textoTemp = novaMsg
    setNovaMsg('')

    // UPDATE OTIMISTA: Mostra na tela na hora
    const msgTemp = {
      id: Math.random(), 
      texto: textoTemp,
      usuario_nome: userProfile.nome,
      usuario_id: userProfile.id
    }
    setMensagens(prev => [...prev, msgTemp])

    // Envia ao banco de fato
    const { error } = await supabase.from('mensagens_chat').insert([
      { texto: textoTemp, usuario_nome: userProfile.nome, usuario_id: userProfile.id }
    ])
    
    if (error) {
      alert("Erro ao enviar mensagem")
      setMensagens(prev => prev.filter(m => m.id !== msgTemp.id))
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 1000 }}>
      <button onClick={() => setIsOpen(!isOpen)} style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#22c55e', color: 'white', border: 'none', fontSize: '24px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>{isOpen ? '✕' : '💬'}</button>
      {isOpen && (
        <div style={{ position: 'absolute', bottom: '80px', right: 0, width: '320px', height: '400px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', borderRadius: '25px', display: 'flex', flexDirection: 'column', border: '1px solid #ddd', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '15px', background: '#22c55e', color: 'white', fontSize: '13px', fontWeight: 'bold' }}>Chat Nova Tratores</div>
          <div ref={scrollRef} style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {mensagens.map(m => (
              <div key={m.id} style={{ alignSelf: m.usuario_id === userProfile.id ? 'flex-end' : 'flex-start', background: m.usuario_id === userProfile.id ? '#22c55e' : '#eee', color: m.usuario_id === userProfile.id ? 'white' : 'black', padding: '8px 12px', borderRadius: '12px', fontSize: '11px', maxWidth: '80%' }}>
                <b style={{ fontSize: '8px', display: 'block', marginBottom: '2px' }}>{m.usuario_nome}</b>
                {m.texto}
              </div>
            ))}
          </div>
          <form onSubmit={enviarMsg} style={{ padding: '10px', display: 'flex', gap: '5px', borderTop: '1px solid #eee' }}>
            <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Dúvida..." style={{ flex: 1, border: '1px solid #ddd', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', outline: 'none' }} />
            <button style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', padding: '5px 12px', cursor: 'pointer' }}>➔</button>
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
  const [isSalvando, setIsSalvando] = useState(false) // Trava contra cliques duplos
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null)
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
    if (isSalvando) return
    setIsSalvando(true)

    try {
      let updates = {}
      if (tarefaSelecionada.status === 'gerar_boleto') {
        if (!fileBoleto) throw new Error("Anexe o boleto!")
        const url = await upload(fileBoleto, 'boletos')
        updates = { status: 'enviar_cliente', tarefa: 'Enviar para Cliente', anexo_boleto: url }
      } else if (tarefaSelecionada.status === 'enviar_cliente') {
        if (!foiBaixado) throw new Error("Baixe o boleto primeiro!")
        updates = { status: 'aguardando_vencimento', tarefa: 'Aguardando Pagamento' }
      } else if (tarefaSelecionada.status === 'vencido') {
        if (!fileComprovante) throw new Error("Anexe o comprovante!")
        const url = await upload(fileComprovante, 'comprovantes')
        updates = { status: 'pago', tarefa: 'Pagamento Efetuado', comprovante_pagamento: url }
      }

      const { error } = await supabase.from('Chamado_NF').update(updates).eq('id', tarefaSelecionada.id)
      
      if (!error) {
        // ATUALIZAÇÃO LOCAL: Remove a tarefa da lista sem refresh
        setTarefas(prev => prev.filter(item => item.id !== tarefaSelecionada.id))
        setTarefaSelecionada(null)
      }
    } catch (e) { alert(e.message) }
    finally { setIsSalvando(false) }
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
          <button onClick={() => setIsSettingsOpen(true)} style={{ background: '#f1f5f9', border: 'none', padding: '10px', borderRadius: '12px', cursor:'pointer' }}>⚙️</button>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} style={{ background:'none', border:'none', color:'#B91C1C', fontWeight:'bold', fontSize:'11px', cursor:'pointer' }}>SAIR</button>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#14532d' }}>Fila: {userProfile?.funcao}</h2>
        {tarefas.map(t => (
          <div key={t.id} onClick={() => { setTarefaSelecionada(t); setFoiBaixado(false); }} style={{ ...glassStyle, padding: '25px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: '0.2s' }}>
            <div>
              <span style={{ fontSize: '8px', fontWeight: '900', color: '#166534', background: 'rgba(34,197,94,0.1)', padding: '4px 8px', borderRadius: '6px' }}>{t.tarefa.toUpperCase()}</span>
              <h3 style={{ margin: '10px 0 0 0', fontWeight: '800' }}>{t.nom_cliente}</h3>
            </div>
            <p style={{ fontWeight: '900', fontSize: '18px', color: '#166534' }}>R$ {t.valor_servico}</p>
          </div>
        ))}
      </div>

      {tarefaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '45px', width: '100%', maxWidth: '450px' }}>
            <h3 style={{ fontWeight: '900', margin: 0 }}>{tarefaSelecionada.nom_cliente}</h3>
            <p style={{ fontSize: '12px', color: '#22c55e', fontWeight: 'bold', marginBottom: '25px' }}>{tarefaSelecionada.tarefa}</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {tarefaSelecionada.status === 'gerar_boleto' && <input type="file" onChange={e => setFileBoleto(e.target.files[0])} />}
              
              {tarefaSelecionada.status === 'enviar_cliente' && (
                <button onClick={() => { window.open(tarefaSelecionada.anexo_boleto); setFoiBaixado(true); }} style={{ background: '#eff6ff', border: '1px solid #3b82f6', padding: '15px', borderRadius: '12px', color: '#1d4ed8', fontWeight: 'bold', cursor: 'pointer' }}>⬇ BAIXAR BOLETO</button>
              )}

              {tarefaSelecionada.status === 'vencido' && <input type="file" onChange={e => setFileComprovante(e.target.files[0])} />}

              <button 
                onClick={handleAvanco} 
                disabled={isSalvando}
                style={{ background: isSalvando ? '#999' : 'black', color: 'white', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
                {isSalvando ? 'PROCESSANDO...' : 'CONFIRMAR E AVANÇAR ⮕'}
              </button>
              <button onClick={() => setTarefaSelecionada(null)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer' }}>CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {userProfile && <ChatFlutuante userProfile={userProfile} />}
    </div>
  )
}