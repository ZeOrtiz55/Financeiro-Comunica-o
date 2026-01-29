'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// --- COMPONENTE DE CHAT ---
function ChatFlutuante({ userProfile }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const scrollRef = useRef()
  const isOpenRef = useRef(false)

  useEffect(() => {
    isOpenRef.current = isOpen
    if (isOpen) setUnreadCount(0)
  }, [isOpen])

  const playSound = () => {
    const audio = new Audio('/notificacao.mp3')
    audio.volume = 0.5
    audio.play().catch(() => {})
  }

  useEffect(() => {
    const channel = supabase
      .channel('chat_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat' }, 
        payload => {
          const msgNova = payload.new
          const souEu = String(msgNova.usuario_id) === String(userProfile?.id)
          setMensagens(prev => {
            if (souEu) {
              const semTemps = prev.filter(m => !String(m.id).startsWith('temp-'))
              return [...semTemps, msgNova]
            }
            if (prev.find(m => m.id === msgNova.id)) return prev
            playSound()
            if (!isOpenRef.current) setUnreadCount(c => c + 1)
            return [...prev, msgNova]
          })
        }
      ).subscribe()

    supabase.from('mensagens_chat').select('*').order('created_at', { ascending: true }).limit(50)
      .then(({ data }) => data && setMensagens(data))

    return () => { supabase.removeChannel(channel) }
  }, [userProfile?.id])

  useEffect(() => { 
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight 
  }, [mensagens, isOpen])

  const enviarMsg = async (e) => {
    e.preventDefault()
    if (!novaMsg.trim()) return
    const textoTemp = novaMsg
    setNovaMsg('')
    const msgTemp = { id: `temp-${Date.now()}`, texto: textoTemp, usuario_nome: userProfile.nome, usuario_id: userProfile.id }
    setMensagens(prev => [...prev, msgTemp])
    await supabase.from('mensagens_chat').insert([{ texto: textoTemp, usuario_nome: userProfile.nome, usuario_id: userProfile.id }])
  }

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 1000 }}>
      <div style={{ position: 'relative' }}>
        <button onClick={() => setIsOpen(!isOpen)} style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#22c55e', color: 'white', border: 'none', fontSize: '24px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>{isOpen ? '✕' : '💬'}</button>
        {!isOpen && unreadCount > 0 && (
          <div style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', border: '2px solid white' }}>{unreadCount}</div>
        )}
      </div>
      {isOpen && (
        <div style={{ position: 'absolute', bottom: '80px', right: 0, width: '320px', height: '400px', background: 'white', borderRadius: '25px', display: 'flex', flexDirection: 'column', border: '1px solid #ddd', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '15px', background: '#22c55e', color: 'white', fontWeight: 'bold' }}>Chat Nova Tratores</div>
          <div ref={scrollRef} style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {mensagens.map(m => (
              <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile.id) ? '#22c55e' : '#eee', color: String(m.usuario_id) === String(userProfile.id) ? 'white' : 'black', padding: '8px 12px', borderRadius: '12px', fontSize: '11px', maxWidth: '85%' }}>
                <b style={{ fontSize: '8px', display: 'block' }}>{m.usuario_nome}</b>{m.texto}
              </div>
            ))}
          </div>
          <form onSubmit={enviarMsg} style={{ padding: '10px', display: 'flex', gap: '5px', borderTop: '1px solid #eee' }}>
            <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Dúvida..." style={{ flex: 1, border: '1px solid #ddd', borderRadius: '8px', padding: '8px', fontSize: '12px', outline: 'none' }} />
            <button style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', padding: '5px 12px' }}>➔</button>
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
  const [isSalvando, setIsSalvando] = useState(false)
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null)
  
  // Estados para o novo fluxo de abertura
  const [isSelecaoOpen, setIsSelecaoOpen] = useState(false) 
  const [showFormNf, setShowFormNf] = useState(false)
  const [novoChamado, setNovoChamado] = useState({
    nom_cliente: '', valor_servico: '', forma_pagamento: 'Boleto 30 dias', 
    setor: 'Financeiro', num_nf_peca: '', num_nf_servico: '', obs: ''
  })

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [fileBoleto, setFileBoleto] = useState(null)
  const [fileComprovante, setFileComprovante] = useState(null)
  const [foiBaixado, setFoiBaixado] = useState(false)

  const router = useRouter()

  const carregarDados = async () => {
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
  }

  useEffect(() => { carregarDados() }, [router])

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
        setTarefas(prev => prev.filter(item => item.id !== tarefaSelecionada.id))
        setTarefaSelecionada(null)
      }
    } catch (e) { alert(e.message) }
    finally { setIsSalvando(false) }
  }

  // FUNÇÃO PARA CRIAR O CHAMADO NO BANCO
  const salvarNovoChamado = async () => {
    if (!novoChamado.nom_cliente || !novoChamado.valor_servico) return alert("Preencha o cliente e o valor!")
    setIsSalvando(true)
    try {
      const { error } = await supabase.from('Chamado_NF').insert([{
        ...novoChamado,
        status: 'gerar_boleto',
        tarefa: 'Gerar Boleto'
      }])
      if (error) throw error
      alert("Chamado de Nota Fiscal aberto com sucesso!")
      setIsSelecaoOpen(false)
      setShowFormNf(false)
      carregarDados() // Recarrega a lista
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
              <span style={{ fontSize: '8px', fontWeight: '900', color: '#166534', background: 'rgba(34,197,94,0.1)', padding: '4px 8px', borderRadius: '6px' }}>{t.tarefa.toUpperCase()}</span>
              <h3 style={{ margin: '10px 0 0 0', fontWeight: '800' }}>{t.nom_cliente}</h3>
            </div>
            <p style={{ fontWeight: '900', fontSize: '18px', color: '#166534' }}>R$ {t.valor_servico}</p>
          </div>
        ))}
        {tarefas.length === 0 && <p style={{textAlign:'center', color:'#999'}}>Nenhuma tarefa pendente. ✨</p>}
      </div>

      {/* MODAL DE ESCOLHA INICIAL (+ NOVO) */}
      {isSelecaoOpen && !showFormNf && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '45px', width: '90%', maxWidth: '400px', textAlign: 'center' }}>
            <h3 style={{fontWeight:'900', marginBottom:'30px'}}>O que deseja abrir?</h3>
            <button onClick={() => setShowFormNf(true)} style={{ width:'100%', background:'#22c55e', color:'white', padding:'20px', borderRadius:'15px', border:'none', fontWeight:'bold', cursor:'pointer', marginBottom:'15px', fontSize: '16px' }}>📑 NOTA FISCAL / FATURAMENTO</button>
            <button onClick={() => alert("Função 'Outros Assuntos' em breve!")} style={{ width:'100%', background:'#f1f5f9', color:'#666', padding:'20px', borderRadius:'15px', border:'none', fontWeight:'bold', cursor:'pointer', marginBottom:'20px', fontSize: '16px' }}>💬 OUTRO ASSUNTO</button>
            <button onClick={() => setIsSelecaoOpen(false)} style={{ background:'none', color:'#999', border:'none', cursor:'pointer' }}>CANCELAR</button>
          </div>
        </div>
      )}

      {/* MODAL DO FORMULÁRIO DE NOTA FISCAL */}
      {showFormNf && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 101, padding: '20px' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '35px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{fontWeight:'900', marginBottom:'20px', color: '#14532d'}}>Novo Faturamento NF</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{fontSize: '11px', fontWeight: 'bold'}}>CLIENTE:</label>
              <input style={{padding: '12px', borderRadius: '10px', border: '1px solid #ddd'}} placeholder="Nome do Cliente" value={novoChamado.nom_cliente} onChange={e => setNovoChamado({...novoChamado, nom_cliente: e.target.value})} />
              
              <div style={{display: 'flex', gap: '10px'}}>
                <div style={{flex: 1}}>
                  <label style={{fontSize: '11px', fontWeight: 'bold'}}>VALOR R$:</label>
                  <input type="number" style={{padding: '12px', borderRadius: '10px', border: '1px solid #ddd', width: '100%'}} placeholder="0,00" value={novoChamado.valor_servico} onChange={e => setNovoChamado({...novoChamado, valor_servico: e.target.value})} />
                </div>
                <div style={{flex: 1}}>
                  <label style={{fontSize: '11px', fontWeight: 'bold'}}>FORMA PGTO:</label>
                  <select style={{padding: '12px', borderRadius: '10px', border: '1px solid #ddd', width: '100%'}} value={novoChamado.forma_pagamento} onChange={e => setNovoChamado({...novoChamado, forma_pagamento: e.target.value})}>
                    <option>Boleto 30 dias</option>
                    <option>Boleto 30/60 dias</option>
                    <option>Pix</option>
                    <option>À Vista</option>
                    <option>Cartão</option>
                  </select>
                </div>
              </div>

              <label style={{fontSize: '11px', fontWeight: 'bold'}}>SETOR DESTINO:</label>
              <select style={{padding: '12px', borderRadius: '10px', border: '1px solid #ddd'}} value={novoChamado.setor} onChange={e => setNovoChamado({...novoChamado, setor: e.target.value})}>
                <option>Financeiro</option>
                <option>Peças</option>
                <option>Oficina</option>
                <option>Pós-Vendas</option>
                <option>Vendas</option>
              </select>

              <div style={{display: 'flex', gap: '10px'}}>
                <div style={{flex: 1}}>
                  <label style={{fontSize: '11px', fontWeight: 'bold'}}>NF PEÇA:</label>
                  <input style={{padding: '12px', borderRadius: '10px', border: '1px solid #ddd', width: '100%'}} placeholder="Nº NF" value={novoChamado.num_nf_peca} onChange={e => setNovoChamado({...novoChamado, num_nf_peca: e.target.value})} />
                </div>
                <div style={{flex: 1}}>
                  <label style={{fontSize: '11px', fontWeight: 'bold'}}>NF SERVIÇO:</label>
                  <input style={{padding: '12px', borderRadius: '10px', border: '1px solid #ddd', width: '100%'}} placeholder="Nº NF" value={novoChamado.num_nf_servico} onChange={e => setNovoChamado({...novoChamado, num_nf_servico: e.target.value})} />
                </div>
              </div>

              <label style={{fontSize: '11px', fontWeight: 'bold'}}>OBSERVAÇÕES:</label>
              <textarea style={{padding: '12px', borderRadius: '10px', border: '1px solid #ddd', minHeight: '60px'}} placeholder="Instruções adicionais..." value={novoChamado.obs} onChange={e => setNovoChamado({...novoChamado, obs: e.target.value})} />

              <button onClick={salvarNovoChamado} disabled={isSalvando} style={{ background: '#22c55e', color: 'white', padding: '18px', borderRadius: '15px', fontWeight: 'bold', border: 'none', marginTop: '10px', cursor: 'pointer' }}>
                {isSalvando ? 'SALVANDO...' : 'CRIAR CHAMADO ⮕'}
              </button>
              <button onClick={() => setShowFormNf(false)} style={{ background: 'none', color: '#999', border: 'none', cursor: 'pointer' }}>VOLTAR</button>
            </div>
          </div>
        </div>
      )}

      {userProfile && <ChatFlutuante userProfile={userProfile} />}
    </div>
  )
}